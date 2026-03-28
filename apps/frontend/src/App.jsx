import { useState } from 'react'
import {BrowserRouter as Router, Routes, Route} from 'react-router-dom'
import './App.css'
import { Toaster } from "react-hot-toast";
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import Dashboard from './components/Dashboard.jsx'
import  Root from './utils/Root.jsx'
import ProtectedRoutes from './utils/ProtectedRoutes.jsx';

function App() {
  

  return (
    <>
    <Toaster position="bottom-left" reverseOrder={false} />
    <Router>
      <Routes>
         <Route path='/' element={<Root />}/>
        <Route path='/login' element={<Login/>} />
        <Route path='/signup' element={<Signup/>} />
        <Route path='/dashboard' 
          element={
            <ProtectedRoutes>
              <Dashboard/>
            </ProtectedRoutes>        
          }/>




        <Route path='/unauthorized' element={<p className='font-bold text-3xl mt-20 ml-20 '>UnAuthorized Path</p>}/>
      </Routes>
    </Router>
      
    </>
  )
}

export default App
