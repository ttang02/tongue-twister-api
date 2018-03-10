var mongoose = require('mongoose');
var Language = mongoose.model('Languages');

//GET : Language
exports.readAll = function(req, res){
    Language.find()
        .then((languages) =>{
            res.status(200).send(languages);
        })
        .catch((err) => {
            res.status(500).send({message : "Some error occured while retrieving languages."});
        });
};

//GET by id : Language
exports.read = function(req, res){
    if(!req.params.langageId){
        res.status(400).send({message : "languageid can not be empty"});
    }
    Language.findById(req.params.langageId)
        .catch((err) => {
            res.status(500).send({message : "Could not retrieve language with id"+req.params.langageId});     
        })
        .then((language) => {
            res.status(200).send(language);
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
    Language.create(req.body)
        .then((language) =>{
            res.status(200).send(language);
        })
        .catch((err) =>{
            res.status(500).send({message : "Some error occurred while saving a new Language"});
    });
    console.log("Language / POST");
}

//PUT by id : Language
exports.update = function(req, res){
    if(!req.body.language){
      res.status(400).send({message : "language can not be empty"});
    }
    if(!req.body.codelang){
      res.status(401).send({message : "codelang can not be empty"});
    }
    Language.findOneAndUpdate({ _id : req.params.languageId}, req.body, {new : true})
        .then((language) =>{
            res.status(200).send(language);
        })
        .catch((err) =>{
            res.status(500).send({message: "Could not update Language with id " + req.params.languageId});
    });

    console.log("Language / POST");
}

//DELETE by id : Language
exports.delete = function(req, res){
    if(!req.params.langageId){
        res.status(400).send({message : "languageid can not be empty"});
    }
    Language.remove({ _id : res.params.languageId})
        .then(() =>{
            res.status(200).send({message: 'This Language is deleted'});
        })
        .catch((err) =>{
            res.status(500).send({message: "Could not delete Language with id: " + req.params.languageId});
        });
    console.log("Language / DELETE");
}