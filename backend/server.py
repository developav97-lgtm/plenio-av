from fastapi import FastAPI, APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone
import firebase_admin
from firebase_admin import credentials, firestore, auth as firebase_auth
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Initialize Firebase Admin
if not firebase_admin._apps:
    # Try to use environment variables first (for production)
    firebase_config = {
        "type": os.getenv("FIREBASE_TYPE", "service_account"),
        "project_id": os.getenv("FIREBASE_PROJECT_ID"),
        "private_key_id": os.getenv("FIREBASE_PRIVATE_KEY_ID"),
        "private_key": os.getenv("FIREBASE_PRIVATE_KEY", "").replace('\\n', '\n'),
        "client_email": os.getenv("FIREBASE_CLIENT_EMAIL"),
        "client_id": os.getenv("FIREBASE_CLIENT_ID"),
        "auth_uri": os.getenv("FIREBASE_AUTH_URI", "https://accounts.google.com/o/oauth2/auth"),
        "token_uri": os.getenv("FIREBASE_TOKEN_URI", "https://oauth2.googleapis.com/token"),
        "auth_provider_x509_cert_url": os.getenv("FIREBASE_AUTH_PROVIDER_X509_CERT_URL", "https://www.googleapis.com/oauth2/v1/certs"),
        "client_x509_cert_url": os.getenv("FIREBASE_CLIENT_X509_CERT_URL")
    }
    
    # Check if we have the required environment variables
    if firebase_config["project_id"] and firebase_config["private_key"] and firebase_config["client_email"]:
        print("Using Firebase environment variables configuration")
        cred = credentials.Certificate(firebase_config)
        firebase_admin.initialize_app(cred)
    else:
        # Fallback to JSON file for local development
        json_file_path = ROOT_DIR / 'firebase_admin.json'
        if json_file_path.exists():
            print("Using Firebase JSON file configuration")
            cred = credentials.Certificate(str(json_file_path))
            firebase_admin.initialize_app(cred)
        else:
            print("ERROR: Firebase credentials not found!")
            print("Environment variables missing:")
            print(f"  FIREBASE_PROJECT_ID: {'✓' if firebase_config['project_id'] else '✗'}")
            print(f"  FIREBASE_PRIVATE_KEY: {'✓' if firebase_config['private_key'] else '✗'}")
            print(f"  FIREBASE_CLIENT_EMAIL: {'✓' if firebase_config['client_email'] else '✗'}")
            print(f"  firebase_admin.json file: {'✓' if json_file_path.exists() else '✗'}")
            raise Exception("Firebase credentials not found. Please set environment variables or provide firebase_admin.json file.")

db = firestore.client()
security = HTTPBearer()

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Authentication middleware
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        decoded_token = firebase_auth.verify_id_token(credentials.credentials)
        return decoded_token
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid authentication: {str(e)}")

# Pydantic Models
class UserProfile(BaseModel):
    uid: str
    email: str
    name: str
    phone: Optional[str] = None
    photoURL: Optional[str] = None
    createdAt: str

class PaymentMethodCreate(BaseModel):
    name: str
    icon: str
    type: Literal['cash', 'bank', 'card'] = 'cash'

class PaymentMethod(PaymentMethodCreate):
    id: str
    userId: str
    balance: float = 0.0
    createdAt: str

class CategoryCreate(BaseModel):
    name: str
    icon: str
    type: Literal['expense', 'income']

class Category(CategoryCreate):
    id: str
    userId: str
    createdAt: str

class TransactionCreate(BaseModel):
    type: Literal['expense', 'income']
    amount: float
    categoryId: str
    paymentMethodId: str
    description: Optional[str] = None
    date: Optional[str] = None
    isRecurring: bool = False
    recurringFrequency: Optional[Literal['daily', 'weekly', 'monthly']] = None

class Transaction(TransactionCreate):
    id: str
    userId: str
    createdAt: str

class BudgetCreate(BaseModel):
    categoryId: str
    amount: float
    period: Literal['monthly', 'weekly']

class Budget(BudgetCreate):
    id: str
    userId: str
    createdAt: str

class IconSuggestionRequest(BaseModel):
    categoryName: str

class IconSuggestionResponse(BaseModel):
    suggestedIcon: str

# Routes
@api_router.get("/")
async def root():
    return {"message": "Plenio Budget API"}

# User Profile
@api_router.post("/users/profile", response_model=UserProfile)
async def create_or_update_profile(profile: UserProfile, current_user: dict = Depends(get_current_user)):
    if profile.uid != current_user['uid']:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    user_ref = db.collection('users').document(profile.uid)
    user_ref.set(profile.model_dump())
    return profile

@api_router.get("/users/profile", response_model=UserProfile)
async def get_profile(current_user: dict = Depends(get_current_user)):
    user_ref = db.collection('users').document(current_user['uid'])
    user_doc = user_ref.get()
    if not user_doc.exists:
        raise HTTPException(status_code=404, detail="Profile not found")
    return UserProfile(**user_doc.to_dict())

# Payment Methods
@api_router.post("/payment-methods", response_model=PaymentMethod)
async def create_payment_method(payment_method: PaymentMethodCreate, current_user: dict = Depends(get_current_user)):
    pm_id = str(uuid.uuid4())
    pm_data = PaymentMethod(
        id=pm_id,
        userId=current_user['uid'],
        **payment_method.model_dump(),
        createdAt=datetime.now(timezone.utc).isoformat()
    )
    db.collection('paymentMethods').document(pm_id).set(pm_data.model_dump())
    return pm_data

@api_router.get("/payment-methods", response_model=List[PaymentMethod])
async def get_payment_methods(current_user: dict = Depends(get_current_user)):
    pms = db.collection('paymentMethods').where('userId', '==', current_user['uid']).stream()
    return [PaymentMethod(**pm.to_dict()) for pm in pms]

@api_router.put("/payment-methods/{pm_id}", response_model=PaymentMethod)
async def update_payment_method(pm_id: str, payment_method: PaymentMethodCreate, current_user: dict = Depends(get_current_user)):
    pm_ref = db.collection('paymentMethods').document(pm_id)
    pm_doc = pm_ref.get()
    if not pm_doc.exists:
        raise HTTPException(status_code=404, detail="Payment method not found")
    
    pm_data = pm_doc.to_dict()
    if pm_data['userId'] != current_user['uid']:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    pm_ref.update(payment_method.model_dump())
    updated_pm = pm_ref.get()
    return PaymentMethod(**updated_pm.to_dict())

@api_router.delete("/payment-methods/{pm_id}")
async def delete_payment_method(pm_id: str, current_user: dict = Depends(get_current_user)):
    pm_ref = db.collection('paymentMethods').document(pm_id)
    pm_doc = pm_ref.get()
    if not pm_doc.exists:
        raise HTTPException(status_code=404, detail="Payment method not found")
    
    pm_data = pm_doc.to_dict()
    if pm_data['userId'] != current_user['uid']:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    pm_ref.delete()
    return {"message": "Payment method deleted"}

# Categories
@api_router.post("/categories", response_model=Category)
async def create_category(category: CategoryCreate, current_user: dict = Depends(get_current_user)):
    cat_id = str(uuid.uuid4())
    cat_data = Category(
        id=cat_id,
        userId=current_user['uid'],
        **category.model_dump(),
        createdAt=datetime.now(timezone.utc).isoformat()
    )
    db.collection('categories').document(cat_id).set(cat_data.model_dump())
    return cat_data

@api_router.get("/categories", response_model=List[Category])
async def get_categories(current_user: dict = Depends(get_current_user)):
    cats = db.collection('categories').where('userId', '==', current_user['uid']).stream()
    return [Category(**cat.to_dict()) for cat in cats]

@api_router.put("/categories/{cat_id}", response_model=Category)
async def update_category(cat_id: str, category: CategoryCreate, current_user: dict = Depends(get_current_user)):
    cat_ref = db.collection('categories').document(cat_id)
    cat_doc = cat_ref.get()
    if not cat_doc.exists:
        raise HTTPException(status_code=404, detail="Category not found")
    
    cat_data = cat_doc.to_dict()
    if cat_data['userId'] != current_user['uid']:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    cat_ref.update(category.model_dump())
    updated_cat = cat_ref.get()
    return Category(**updated_cat.to_dict())

@api_router.delete("/categories/{cat_id}")
async def delete_category(cat_id: str, current_user: dict = Depends(get_current_user)):
    cat_ref = db.collection('categories').document(cat_id)
    cat_doc = cat_ref.get()
    if not cat_doc.exists:
        raise HTTPException(status_code=404, detail="Category not found")
    
    cat_data = cat_doc.to_dict()
    if cat_data['userId'] != current_user['uid']:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    cat_ref.delete()
    return {"message": "Category deleted"}

# Icon Suggestion with AI
@api_router.post("/suggest-icon", response_model=IconSuggestionResponse)
async def suggest_icon(request: IconSuggestionRequest, current_user: dict = Depends(get_current_user)):
    try:
        # Simple icon mapping based on category name
        category_name = request.categoryName.lower()
        icon_mapping = {
            'food': '🍽️',
            'transport': '🚗',
            'shopping': '🛒',
            'entertainment': '🎬',
            'health': '🏥',
            'education': '📚',
            'utilities': '💡',
            'rent': '🏠',
            'salary': '💰',
            'investment': '📈',
            'gift': '🎁',
            'travel': '✈️',
            'gas': '⛽',
            'groceries': '🛒',
            'restaurant': '🍽️',
            'coffee': '☕',
            'gym': '💪',
            'medicine': '💊',
            'clothes': '👕',
            'phone': '📱',
            'internet': '🌐'
        }
        
        # Find matching icon or use default
        suggested_icon = "💰"  # default
        for key, icon in icon_mapping.items():
            if key in category_name:
                suggested_icon = icon
                break
                
        return IconSuggestionResponse(suggestedIcon=suggested_icon)
    except Exception as e:
        logging.error(f"Error suggesting icon: {e}")
        return IconSuggestionResponse(suggestedIcon="💰")

# Transactions
@api_router.post("/transactions", response_model=Transaction)
async def create_transaction(transaction: TransactionCreate, current_user: dict = Depends(get_current_user)):
    trans_id = str(uuid.uuid4())
    
    # Preparar datos de transacción
    transaction_data = transaction.model_dump()
    if not transaction_data.get('date'):
        transaction_data['date'] = datetime.now(timezone.utc).isoformat()
    
    trans_data = Transaction(
        id=trans_id,
        userId=current_user['uid'],
        createdAt=datetime.now(timezone.utc).isoformat(),
        **transaction_data
    )
    
    # Update payment method balance
    pm_ref = db.collection('paymentMethods').document(transaction.paymentMethodId)
    pm_doc = pm_ref.get()
    if pm_doc.exists:
        pm_data = pm_doc.to_dict()
        current_balance = pm_data.get('balance', 0.0)
        if transaction.type == 'income':
            new_balance = current_balance + transaction.amount
        else:
            new_balance = current_balance - transaction.amount
        pm_ref.update({'balance': new_balance})
    
    db.collection('transactions').document(trans_id).set(trans_data.model_dump())
    return trans_data

@api_router.get("/transactions", response_model=List[Transaction])
async def get_transactions(current_user: dict = Depends(get_current_user)):
    trans = db.collection('transactions').where('userId', '==', current_user['uid']).limit(500).stream()
    transactions = [Transaction(**t.to_dict()) for t in trans]
    # Sort by date in Python instead of Firestore to avoid index requirement
    transactions.sort(key=lambda x: x.date, reverse=True)
    return transactions[:100]

@api_router.delete("/transactions/{trans_id}")
async def delete_transaction(trans_id: str, current_user: dict = Depends(get_current_user)):
    trans_ref = db.collection('transactions').document(trans_id)
    trans_doc = trans_ref.get()
    if not trans_doc.exists:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    trans_data = trans_doc.to_dict()
    if trans_data['userId'] != current_user['uid']:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    # Revert payment method balance
    pm_ref = db.collection('paymentMethods').document(trans_data['paymentMethodId'])
    pm_doc = pm_ref.get()
    if pm_doc.exists:
        pm_data = pm_doc.to_dict()
        current_balance = pm_data.get('balance', 0.0)
        if trans_data['type'] == 'income':
            new_balance = current_balance - trans_data['amount']
        else:
            new_balance = current_balance + trans_data['amount']
        pm_ref.update({'balance': new_balance})
    
    trans_ref.delete()
    return {"message": "Transaction deleted"}

# Budgets
@api_router.post("/budgets", response_model=Budget)
async def create_budget(budget: BudgetCreate, current_user: dict = Depends(get_current_user)):
    budget_id = str(uuid.uuid4())
    budget_data = Budget(
        id=budget_id,
        userId=current_user['uid'],
        **budget.model_dump(),
        createdAt=datetime.now(timezone.utc).isoformat()
    )
    db.collection('budgets').document(budget_id).set(budget_data.model_dump())
    return budget_data

@api_router.get("/budgets", response_model=List[Budget])
async def get_budgets(current_user: dict = Depends(get_current_user)):
    budgets = db.collection('budgets').where('userId', '==', current_user['uid']).stream()
    return [Budget(**b.to_dict()) for b in budgets]

@api_router.put("/budgets/{budget_id}", response_model=Budget)
async def update_budget(budget_id: str, budget: BudgetCreate, current_user: dict = Depends(get_current_user)):
    budget_ref = db.collection('budgets').document(budget_id)
    budget_doc = budget_ref.get()
    if not budget_doc.exists:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    budget_data = budget_doc.to_dict()
    if budget_data['userId'] != current_user['uid']:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    budget_ref.update(budget.model_dump())
    updated_budget = budget_ref.get()
    return Budget(**updated_budget.to_dict())

@api_router.delete("/budgets/{budget_id}")
async def delete_budget(budget_id: str, current_user: dict = Depends(get_current_user)):
    budget_ref = db.collection('budgets').document(budget_id)
    budget_doc = budget_ref.get()
    if not budget_doc.exists:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    budget_data = budget_doc.to_dict()
    if budget_data['userId'] != current_user['uid']:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    budget_ref.delete()
    return {"message": "Budget deleted"}

# Statistics
@api_router.get("/stats/summary")
async def get_summary(current_user: dict = Depends(get_current_user)):
    # Get all transactions for current user
    trans = db.collection('transactions').where('userId', '==', current_user['uid']).stream()
    
    total_income = 0.0
    total_expense = 0.0
    category_expenses = {}
    
    for t in trans:
        t_data = t.to_dict()
        if t_data['type'] == 'income':
            total_income += t_data['amount']
        else:
            total_expense += t_data['amount']
            cat_id = t_data['categoryId']
            category_expenses[cat_id] = category_expenses.get(cat_id, 0.0) + t_data['amount']
    
    # Get payment methods balances
    pms = db.collection('paymentMethods').where('userId', '==', current_user['uid']).stream()
    total_balance = sum([pm.to_dict().get('balance', 0.0) for pm in pms])
    
    return {
        "totalIncome": total_income,
        "totalExpense": total_expense,
        "totalBalance": total_balance,
        "categoryExpenses": category_expenses
    }

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)