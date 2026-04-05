# Expense_app

A mobile application and backend system to automatically classify and manage expense data.

## Current Progress

- **Data Processing**: 
  - Developed Jupyter notebooks for cleaning raw expense data (`backend/Data/data_cleaning.ipynb`).
  - Output standardized data to `clean_data.csv` to ensure high-quality model training.
- **Model Development**:
  - Built a machine learning pipeline to categorize expenses based on their text descriptions.
  - Evaluated multiple algorithms (Naive Bayes, Logistic Regression, Linear SVC) using TF-IDF feature extraction.
  - Selected **Linear SVC** as the highest performing classifier.
  - The final trained model has been successfully exported to `backend/model/expense_classifier.joblib` and is ready for integration with the backend API.
