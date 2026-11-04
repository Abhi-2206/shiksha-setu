const express = require('express')

const app = express()


app.get("/health",(req,res)=>{
    res.json({status:200,message:"ok"})
})


app.listen(3000,()=>{
    console.log("Server Running on Port 3000")
})