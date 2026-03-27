import { useState } from 'react'
import {BrowserRouter as Router, Routes, Route} from 'react-router-dom'
import './App.css'
import { Toaster } from "react-hot-toast";
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import Dashboard from './components/Dashboard.jsx'

function App() {
  

  return (
    <>
    <Toaster position="bottom-left" reverseOrder={false} />
    <Router>
      <Routes>
        <Route path='/' element={<h1>Zynk</h1>} />
        <Route path='/login' element={<Login/>} />
        <Route path='/signup' element={<Signup/>} />
        <Route path='/dashboard' element={<Dashboard/>}/>
      </Routes>
    </Router>
      
    </>
  )
}

export default App
