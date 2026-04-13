# InstantLedger 💰

**InstantLedger** is an AI-powered expense tracking ecosystem designed to automate your financial management. By combining intelligent SMS detection, computer vision (OCR), and Natural Language Processing (NLP), InstantLedger takes the manual work out of logging expenses.

![InstantLedger Banner](https://img.shields.io/badge/Tech-AI%20%7C%20React%20Native%20%7C%20FastAPI-blue?style=for-the-badge)

## 🚀 Key Features

- **Automated SMS Tracking**: Automatically detects and extracts transaction details (Amount, Merchant, Date) from banking SMS notifications (Android).
- **AI Receipt Scanning**: Snap a photo or upload a receipt from your gallery. Our AI-powered OCR (PaddleOCR) and NER (SpaCy) will extract the merchant, total, and individual line items.
- **Smart Categorization**: Every transaction is automatically categorized (e.g., Food, Shopping, Bills) using a trained SpaCy NLP model.
- **Multi-User Support**: Secure user authentication (JWT) with cloud-synced data via PostgreSQL (Neon).
- **Interactive Dashboard**: Track your monthly spending at a glance and view your transaction history with rich visual cues.
- **Manual Adjustments**: Full control to edit, add, or delete expenses and line items manually.

## 🛠️ Tech Stack

### **Frontend (Mobile App)**
- **Framework**: [React Native](https://reactnative.dev/) with [Expo](https://expo.dev/) (SDK 50+)
- **Navigation**: [Expo Router](https://docs.expo.dev/routing/introduction/) (File-based routing)
- **Styling**: Vanilla CSS-in-JS for ultra-smooth, premium dark-mode aesthetics.
- **Animations**: [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/) for fluid micro-interactions.
- **State Management**: React Hooks (State, Context, Refs).

### **Backend (API Service)**
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python)
- **Database**: PostgreSQL (hosted on [Neon](https://neon.tech/)) with [SQLAlchemy](https://www.sqlalchemy.org/) ORM.
- **AI/ML Engine**:
    - **OCR**: [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR) for robust text extraction from receipts.
    - **NER**: [SpaCy](https://spacy.io/) with a custom-trained model for entity extraction and categorization.
- **Authentication**: JWT-based OAuth2 security.

## 📦 Project Structure

```bash
Expense_app/
├── frontend/          # React Native / Expo application
│   ├── app/           # Screen routes (Expo Router)
│   ├── components/    # Reusable UI components
│   ├── services/      # API and SMS service logic
│   └── constants/     # Styling and theme tokens
└── backend/           # FastAPI Python server
    ├── ml_model/      # Trained SpaCy models
    ├── spacy_ner.py   # NLP extraction logic
    ├── paddle_ocr.py  # OCR processing logic
    ├── auth.py        # Authentication & JWT
    ├── database.py    # SQLAlchemy models & DB config
    └── main.py        # API Endpoints
```

## 🏁 Getting Started

### **1. Backend Setup**
1. Navigate to the `/backend` directory.
2. Create a virtual environment:
   ```bash
   python -m venv env
   source env/bin/activate  # Or env\Scripts\activate on Windows
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Set up your `.env` file with your `DATABASE_URL` (Neon PostgreSQL) and `SECRET_KEY`.
5. Run the server:
   ```bash
   uvicorn main:app --reload
   ```

### **2. Frontend Setup**
1. Navigate to the `/frontend` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Expo development server:
   ```bash
   npx expo start
   ```
4. Open the app using **Expo Go** (for shared components) or a **Development Build** (required for SMS detection features).

## 🔒 Permissions (Android)
To enable automated SMS tracking, InstantLedger requires **Notification Access**.
- The app will prompt you on start if permissions are missing.
- This allows our Headless JS task to detect incoming SMS from your banking apps safely.

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
Built with ❤️ for better financial management.