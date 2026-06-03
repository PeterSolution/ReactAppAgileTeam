import './top.css';
import { useState } from "react";
import React from "react";
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth, ENDPOINTS } from '../../backendConnection';

function Top() {
    const navigate = useNavigate();
 
    const handleLogout = async () => {
        try {
            await fetchWithAuth(ENDPOINTS.auth.logout(), {
                method: "POST"
            });
        } catch (e) {
            console.error("Error logging out from backend:", e);
        }
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("currentUser");
        navigate('/');
    };
 
    return (
        <header className="top-bar">
            <nav className="top-nav">
                <a href="/main" className="top-link">Projekty</a>
                <a href="/students" className="top-link">Studenci</a>
                <a href="/chat" className="top-link">Czat Ogólny</a>
            </nav>
            <div className='btnRightTopMain'>
                <button className="logout-btn" onClick={handleLogout}>
                    Wyloguj
                </button>
            </div>
            <hr/>
        </header>
    );
}
 
export default Top;

