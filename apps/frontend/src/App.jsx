import { useState } from 'react'
import {BrowserRouter as Router, Routes, Route} from 'react-router-dom'
import './App.css'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'

function App() {
  

  return (
    <>
    <Router>
      <Routes>
        <Route path='/' element={<h1>Zynk</h1>} />
        <Route path='/login' element={<Login/>} />
        <Route path='/signup' element={<Signup/>} />
      </Routes>
    </Router>
      
    </>
  )
}

export default App
