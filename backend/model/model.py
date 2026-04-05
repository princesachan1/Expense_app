import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.linear_model import LogisticRegression
from sklearn.svm import LinearSVC
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report, accuracy_score

df = pd.read_csv('data/clean_data.csv')
X = df['title']
y = df['categories']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

models = {
    "Naive Bayes": MultinomialNB(),
    "Logistic Regression": LogisticRegression(max_iter=1000,class_weight='balanced', C=1.5),
    "Linear SVC": LinearSVC(class_weight='balanced', C=0.5)
}

for name, algorithm in models.items():
    print(f"--- Training {name} ---")
    
    pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(stop_words='english', max_features=40000, ngram_range=(1, 3), min_df=2, sublinear_tf=True)),
        ('clf', algorithm)
    ])
    
    pipeline.fit(X_train, y_train)
    
    predictions = pipeline.predict(X_test)
    
    acc = accuracy_score(y_test, predictions)
    print(f"Accuracy: {acc:.4f}\n")
    print(classification_report(y_test, predictions))
    print("="*50 + "\n")

print("Training the final model on the entire dataset...")
final_pipeline = Pipeline([
    ('tfidf', TfidfVectorizer(stop_words='english', max_features=40000, ngram_range=(1, 3), min_df=2, sublinear_tf=True)),
    ('clf', LinearSVC(class_weight='balanced', C=0.5))
])

final_pipeline.fit(X, y)

joblib.dump(final_pipeline, 'expense_classifier.joblib')
print("- Final model saved successfully as 'expense_classifier.joblib'!")