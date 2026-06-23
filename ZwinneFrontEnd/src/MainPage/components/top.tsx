import './top.css';
import { useState } from "react";
import React from "react";
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth, ENDPOINTS } from '../../backendConnection';

function Top() {
    const navigate = useNavigate();
    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
    });

    const toggleTheme = () => {
        const nextTheme = theme === 'light' ? 'dark' : 'light';
        localStorage.setItem('theme', nextTheme);
        setTheme(nextTheme);
        window.dispatchEvent(new Event('theme-changed'));
    };
 
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

    const user = JSON.parse(localStorage.getItem("currentUser") || "{}");

 
    return (
        <header className="top-bar">
            <nav className="top-nav">
                <a href="/main" className="top-link">Projekty</a>
                <a href="/students" className="top-link">Studenci</a>
                <a href="/calendar" className="top-link">Kalendarz</a>
                <a href="/chat" className="top-link">Czat Ogólny</a>
                {user.rola === "ROLE_PROWADZACY" && (
                    <a href="/add" className="top-link">Dodaj Projekt</a>
                )}
            </nav>
            <div className='btnRightTopMain' style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button 
                    onClick={toggleTheme} 
                    className="theme-toggle-btn"
                    title={theme === 'light' ? 'Włącz ciemny motyw' : 'Włącz jasny motyw'}
                    style={{
                        background: 'none',
                        border: '1px solid var(--border-color, rgba(0,0,0,0.15))',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        padding: '0.35rem 0.6rem',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'inherit',
                        transition: 'all 0.2s ease'
                    }}
                >
                    {theme === 'light' ? '🌙' : '☀️'}
                </button>
                <button className="logout-btn" onClick={handleLogout}>
                    Wyloguj
                </button>
            </div>
            <hr/>
        </header>
    );
}
 
export default Top;

