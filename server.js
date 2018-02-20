//Modules
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const yaml = require('yamljs');

//Connect to database
const db = mongoose.connect('mongodb://localhost/tonguetwister');

//swagger
const swaggerUi = require('swagger-ui-express');
const swaggerdoc = yaml.load('./swagger/swagger.yaml');

//imports models
const Languages = require('./api/models/langage');
const TongueTwister = require('./api/models/tonguetwister');

//Import Routes
const languagesRoutes = require('./api/routes/languageRoute');
const tonguetwisterRoutes = require('./api/routes/tongueTwisterRoute');

const port = process.env.PORT || 3000;

//use body-parser middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended : false}));

//Init routes with app
languagesRoutes(app);
tonguetwisterRoutes(app);

//swagger 
app.use('/', swaggerUi.serve, swaggerUi.setup(swaggerdoc));

//error 
app.use(function(err, req, res, next){
    console.log(err);
    res.status(422).send({error : err.message});
});

app.listen(port, function(){
    console.log("App now running on port", port);
});