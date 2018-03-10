var mongoose = require('mongoose');
var TongueTwisters = mongoose.model('TongueTwisters');
var Language = mongoose.model('Languages');

//GET : TongueTwister
exports.readAll = function(req, res){
    TongueTwisters.find()
        .then((tonguetwisters) =>{
            res.status(200).send(tonguetwisters);
        })
        .catch((err) => {
            res.status(500).send({message : "Some error occured while retrieving tonguetwisters."});
        });
    console.log("Tongue Twister / GET")
};

//GET by ID : TongueTwister
exports.read = function(req, res){
    if(!req.params.ttId){
        res.status(400).send({message : "ttId can not be empty"});
    }
    TongueTwister.findById(req.params.ttId)
        .catch((err) => {
            res.status(500).send({message : "Could not retrieve tonguetwister with id : "+req.params.ttId});
        })
        .then((tt) => {
            res.status(200).send(tt);
        });
    console.log("Tongue Twister / GET by ID");
};

//GET by language : TongueTwister
exports.readBylanguage = function(req, res){
    //params = language
    if(!req.params.languageId){
        res.status(400).send({message : "languageId can not be empty"});
    }
    Language.findOne({ codelang : req.params.languageId})
        .catch((err) => {
            res.status(500).send({message : "Could not retrieve tonguetwister by language code : "+req.params.languageId });
        })
        .then((idLanguage) =>{
            TongueTwisters.find({languageid: idLanguage})
            .catch((err) =>{
                res.status(501).send({message : "Could not retrieve tonguetwister by language code : "+idLanguage});
            })
            .then((tts) =>{
                res.status(200).send(tts);
            });
        });

    console.log("Tongue Twister / GET By language");
};

//POST : TongueTwister
exports.create = function(req, res){
    if(!req.body.phrase){
        res.status(400).send({message : "phrase can not be empty"});
    }
    else if(!req.body.languageid){
        res.status(401).send({message : "languageid can not be empty"});
    }
    Language.findOne({_id : req.body.languageid})
        .catch((err) =>{
            res.status(500).send({message : "Can not found the language id in the database"});
        })
        .then((language) =>{
            TongueTwisters.create(req.body)
            .catch((err) =>{
                res.status(501).send({message : "Some error occured while creating a new tonguetwister"});
            })
            .then((tonguetwister) =>{
                res.status(200).send(tonguetwister);
            });
        });
    console.log("TongueTwister / POST");
};

//PUT : TongueTwister
exports.update = function(req, res){
    if(!req.body.phrase){
        res.status(400).send({message : "phrase can not be empty"});
    }
      if(!req.body.languageid){
        res.status(401).send({message : "languageId can not be empty"});
    }
    if(!req.params.ttId){
        res.status(402).send({message : "ttId can not be empty"});
    }

    TongueTwisters.findByIdAndUpdate({ _id: req.params.ttId}, req.body, {new : true})
        .catch((err) =>{
            res.status(500).send({message : "Could not update the tongue twister with the id"});
        })
        .then((tt) =>{
            res.status(200).send(tt);
    });
    console.log("Tongue Twister / PUT");
};

//DELETE : TongueTwister
exports.delete = function(req, res){
    if(!req.params.ttId){
        res.status(400).send({message : "ttId can not be empty"});
    }
    TongueTwisters.remove({ _id : res.params.ttId})
        .then(() =>{
            res.status(200).send({message: 'This tongue twister is deleted'});
        })
        .catch((err) =>{
            res.status(500).send({message: "Could not delete Tongue Twister with id: " + req.params.ttId});
        });
    console.log("Tongue Twister / DELETE");
};

//DELETE by language : TongueTwister
