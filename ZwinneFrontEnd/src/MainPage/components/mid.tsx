import './mid.css';
import { useState } from "react";
import React from "react";
import { useNavigate } from 'react-router-dom';

function Mid() {
    const navigate = useNavigate();
    function handleAddProject() {
        navigate('/add');
    }
    return (
        <>
            <center>
                <br/>
                <br/>
                <h1>Lista Projektow</h1>
                <br/>
                <br/>
                <h2><a onClick={handleAddProject}>Dodaj projekt</a></h2>
                <br/>
                <br/>
            </center>
        </>
    )
}

export default Mid;

