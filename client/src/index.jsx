// client/src/index.jsx (UPDATED)

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { getCurrentUser } from './store/slices/authSlice'; // <-- IMPORT KAREIN
import App from './App';
import './index.css';

// <<< --- UPDATE YAHAN HAI --- >>>
// App render hone se pehle hi hum user ka data fetch kar lenge
if (localStorage.getItem("token")) {
  store.dispatch(getCurrentUser());
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);