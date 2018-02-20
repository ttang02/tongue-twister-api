var mongoose = require('mongoose');
var Language = mongoose.model('Languages');

//GET by id : Language
exports.read = function(req, res){
    if(!req.params.langageId){
        res.status(400).send({message : "languageid can not be empty"});
    }
    Language.findById(req.params.langageId)
        .catch((err) => {
            res.status(500).send({message : "Could not retrieve language with id"+req.params.langageId});     
        })
        .then((message) => {
            res.status(200).send(message);
        });
    console.log("Language / GET by ID");
};

//POST : language
exports.create = function(req, res){
    if(!req.body.language){
        res.status(400).send({message : "language can not be empty"});
    }
    if(!req.body.codelang){
        res.status(401).send({message : "codelang can not be empty"});
    }
    var Language = new Language(req.body);
    Language.save((err, message) =>{
        
    });
}