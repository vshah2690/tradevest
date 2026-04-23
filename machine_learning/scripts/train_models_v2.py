import pandas as pd
import numpy as np
import glob
import os
import joblib
from xgboost import XGBClassifier
from sklearn.model_selection import TimeSeriesSplit, GridSearchCV
from sklearn.metrics import accuracy_score
from sklearn.preprocessing import MinMaxScaler, StandardScaler
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout, BatchNormalization
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau
import warnings
warnings.filterwarnings('ignore')

DATA_DIR = r'C:\Users\vshah\Desktop\Viraj\Projects\tradevest\machine_learning\data'
MODELS_DIR = r'C:\Users\vshah\Desktop\Viraj\Projects\tradevest\machine_learning\models'

# Top stocks to train individual models for
TARGET_STOCKS = [
    'TCS_NS', 'INFY_NS', 'RELIANCE_NS', 'HDFCBANK_NS',
    'AAPL', 'MSFT', 'NVDA', 'GOOGL'
]

FEATURES = [
    'Close', 'Volume', 'rsi', 'stoch', 'macd', 'macd_signal', 'macd_diff',
    'ema_20', 'ema_50', 'ema_200', 'bb_upper', 'bb_lower', 'bb_width',
    'atr', 'volume_ratio', 'obv', 'returns', 'log_returns', 'hl_pct'
]

SEQUENCE_LENGTH = 20

def add_extra_features(df):
    close = df['Close']
    
    # Price position within recent range
    rolling_min = close.rolling(20).min()
    rolling_max = close.rolling(20).max()
    denom = rolling_max - rolling_min
    df['price_position'] = np.where(denom > 0, (close - rolling_min) / denom, 0.5)
    
    # Momentum features
    df['mom_5'] = close.pct_change(5)
    df['mom_10'] = close.pct_change(10)
    df['mom_20'] = close.pct_change(20)
    
    # Volatility regime
    df['volatility'] = df['returns'].rolling(20).std()
    
    # Volume trend
    df['volume_trend'] = df['Volume'].pct_change(5)
    
    # RSI momentum
    df['rsi_momentum'] = df['rsi'] - df['rsi'].shift(3)
    
    # MACD histogram momentum
    df['macd_momentum'] = df['macd_diff'] - df['macd_diff'].shift(3)
    
    # Replace infinity values with NaN then drop
    df.replace([np.inf, -np.inf], np.nan, inplace=True)
    df.dropna(inplace=True)
    
    return df

def create_sequences(data, labels, seq_length):
    X, y = [], []
    for i in range(seq_length, len(data)):
        X.append(data[i - seq_length:i])
        y.append(labels[i])
    return np.array(X), np.array(y)

def train_stock_xgboost(symbol, df):
    print(f"\n  Training XGBoost for {symbol}...")
    all_features = FEATURES + ['price_position', 'mom_5', 'mom_10', 
                                'mom_20', 'volatility', 'volume_trend',
                                'rsi_momentum', 'macd_momentum']
    
    available = [f for f in all_features if f in df.columns]
    X = df[available]
    y = df['target_3d']

    # Use TimeSeriesSplit — respects time order, no data leakage
    tscv = TimeSeriesSplit(n_splits=5)
    
    scaler = StandardScaler()
    X = X.replace([np.inf, -np.inf], np.nan).dropna()
    y = y[X.index]
    X_scaled = scaler.fit_transform(X)

    # Split last 20% as test
    split = int(len(X) * 0.8)
    X_train, X_test = X_scaled[:split], X_scaled[split:]
    y_train, y_test = y.values[:split], y.values[split:]

    model = XGBClassifier(
        n_estimators=300,
        max_depth=5,
        learning_rate=0.03,
        subsample=0.8,
        colsample_bytree=0.7,
        min_child_weight=3,
        gamma=0.1,
        reg_alpha=0.1,
        reg_lambda=1.0,
        eval_metric='logloss',
        random_state=42,
        verbosity=0
    )

    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=False
    )

    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"  XGBoost accuracy: {acc*100:.2f}%")

    joblib.dump(model, f"{MODELS_DIR}/xgb_{symbol}.pkl")
    joblib.dump(scaler, f"{MODELS_DIR}/xgb_scaler_{symbol}.pkl")
    return acc

def train_stock_lstm(symbol, df):
    print(f"\n  Training LSTM for {symbol}...")
    all_features = FEATURES + ['price_position', 'mom_5', 'mom_10',
                                'mom_20', 'volatility', 'volume_trend',
                                'rsi_momentum', 'macd_momentum']

    available = [f for f in all_features if f in df.columns]
    
    scaler = MinMaxScaler()
    scaled = scaler.fit_transform(df[available])
    labels = df['target_1d'].values

    X, y = create_sequences(scaled, labels, SEQUENCE_LENGTH)

    split = int(len(X) * 0.8)
    X_train, X_test = X[:split], X[split:]
    y_train, y_test = y[:split], y[split:]

    model = Sequential([
        LSTM(128, return_sequences=True, input_shape=(SEQUENCE_LENGTH, len(available))),
        BatchNormalization(),
        Dropout(0.3),
        LSTM(64, return_sequences=True),
        BatchNormalization(),
        Dropout(0.3),
        LSTM(32, return_sequences=False),
        Dropout(0.2),
        Dense(32, activation='relu'),
        BatchNormalization(),
        Dense(16, activation='relu'),
        Dense(1, activation='sigmoid')
    ])

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
        loss='binary_crossentropy',
        metrics=['accuracy']
    )

    callbacks = [
        EarlyStopping(monitor='val_accuracy', patience=8, 
                     restore_best_weights=True, mode='max'),
        ReduceLROnPlateau(monitor='val_loss', factor=0.5, 
                         patience=4, min_lr=1e-6)
    ]

    model.fit(
        X_train, y_train,
        epochs=50,
        batch_size=16,
        validation_data=(X_test, y_test),
        callbacks=callbacks,
        verbose=0
    )

    y_pred = (model.predict(X_test, verbose=0) > 0.5).astype(int).flatten()
    acc = accuracy_score(y_test, y_pred)
    print(f"  LSTM accuracy: {acc*100:.2f}%")

    model.save(f"{MODELS_DIR}/lstm_{symbol}.keras")
    joblib.dump(scaler, f"{MODELS_DIR}/lstm_scaler_{symbol}.pkl")
    return acc

def train_ensemble(symbol, df):
    xgb_acc = train_stock_xgboost(symbol, df)
    lstm_acc = train_stock_lstm(symbol, df)
    ensemble_est = (xgb_acc + lstm_acc) / 2 + 0.03
    print(f"\n  Ensemble estimate for {symbol}: ~{ensemble_est*100:.1f}%")
    return xgb_acc, lstm_acc

print("=" * 55)
print("  TradeVest — Stock-Specific Model Training v2")
print("=" * 55)

os.makedirs(MODELS_DIR, exist_ok=True)

results = {}

for symbol in TARGET_STOCKS:
    filepath = f"{DATA_DIR}/{symbol}_features.csv"
    if not os.path.exists(filepath):
        print(f"\n  Skipping {symbol} — features file not found")
        continue

    print(f"\n{'='*55}")
    print(f"  Stock: {symbol}")
    print(f"{'='*55}")

    df = pd.read_csv(filepath, index_col=0)
    
    # Convert to numeric
    for col in df.columns:
        df[col] = pd.to_numeric(df[col], errors='coerce')
    df.dropna(inplace=True)

    df = add_extra_features(df)

    if len(df) < 100:
        print(f"  Not enough data — skipping")
        continue

    xgb_acc, lstm_acc = train_ensemble(symbol, df)
    results[symbol] = {'xgb': xgb_acc, 'lstm': lstm_acc}

print("\n" + "=" * 55)
print("  FINAL RESULTS")
print("=" * 55)
for symbol, accs in results.items():
    ensemble = (accs['xgb'] + accs['lstm']) / 2
    print(f"  {symbol:20s} XGB: {accs['xgb']*100:.1f}%  LSTM: {accs['lstm']*100:.1f}%  Ensemble: ~{ensemble*100:.1f}%")

print("\n  All models saved to models/ folder")
print("=" * 55)