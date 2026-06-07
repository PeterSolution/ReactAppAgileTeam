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
import TasksPage from './TasksPage/TasksPage';
import ChatPage from './ChatPage/ChatPage';

function App() {

  return (
        <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/edit/:id" element={<EditPage />} />
            <Route path="/main" element={<MainPage />} />
            <Route path='/students' element={<StudenciPage />} />
            <Route path='/project/:id/students' element={<StudenciPage />} />
            <Route path='/add' element={<AddPage />} />
            <Route path='/project/:id/tasks' element={<TasksPage />} />
            <Route path='/chat' element={<ChatPage />} />
        </Routes>
  )
}

export default App
