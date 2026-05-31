import { useState } from 'react'
// import reactLogo from './assets/react.svg'
// import viteLogo from '/vite.svg'
import './App.css'
import { Routes, Route } from 'react-router-dom';
import LoginPage from './LoginPage/LoginPage';
import RegisterPage from './RegisterPage/RegisterPage';
import EditPage from './EditPage/EditPage';
import MainPage from './MainPage/MainPage';
import StudenciPage from './Studenci/StudenciPage';
import AddPage from './AddPage/AddPage';

function App() {

  return (
        <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/edit" element={<EditPage />} />
            <Route path="/main" element={<MainPage />} />
            <Route path='/students' element={<StudenciPage />} />
            <Route path='/add' element={<AddPage />} />
        </Routes>
  )
}

export default App
