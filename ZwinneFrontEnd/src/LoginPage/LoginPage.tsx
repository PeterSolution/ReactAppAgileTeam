import React, { useState } from 'react';
import './loginPage.css';
import Page from './components/page'

function LoginPage() {

    return (
        <>
            {/* <div className='Center'>
                <h1>Logowanie</h1>
                <h2>E-mail:</h2>
                <input type="text" name="email" />
                <h2>Hasło:</h2>
                <input type="password" name="password" />
                <button type="submit">Zaloguj</button>
                <div className='right'>
                    <a href="/register">Rejestracja</a>
                </div>
            </div> */}
            <Page />
        </>
    )
}
export default LoginPage;