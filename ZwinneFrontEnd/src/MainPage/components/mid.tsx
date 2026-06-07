import './mid.css';
import { useState } from "react";
import React from "react";
import { useNavigate } from 'react-router-dom';

function Mid() {
    const navigate = useNavigate();
    function handleAddProject() {
        navigate('/add');
    }

    const currentUserStr = localStorage.getItem("currentUser");
    const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;
    const isLecturer = currentUser?.rola === "ROLE_PROWADZACY";

    return (
        <>
            <center>
                <br/>
                <br/>
                <h1>Lista Projektow</h1>
                <br/>
                <br/>
                {isLecturer && (
                    <>
                        <h2><a onClick={handleAddProject} style={{ cursor: 'pointer', textDecoration: 'underline' }}>Dodaj projekt</a></h2>
                        <br/>
                        <br/>
                    </>
                )}
            </center>
        </>
    )
}

export default Mid;

