import './top.css';
import { useState } from "react";
import React from "react";
import { useNavigate } from 'react-router-dom';

function Top() {
    const navigate = useNavigate();
 
    const handleLogout = () => {
        navigate('/');
    };
 
    return (
        <header className="top-bar">
            <nav className="top-nav">
                <a href="/main" className="top-link">Projekty</a>
                <a href="/students" className="top-link">Studenci</a>
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

