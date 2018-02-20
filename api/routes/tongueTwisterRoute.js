module.exports = function(app){
    var tonguetwister = require('../controllers/tongueTwisterController');

    app.route('/api/tonguetwister')
        .get(tonguetwister.readAll)
        .post(tonguetwister.create)
    ;
    app.route('/api/tonguetwister/:ttId')
        .get(tonguetwister.read)
        .put(tonguetwister.update)
        .delete(tonguetwister.delete)
    ;
    app.route('/api/tonguetwister/language/:languageId')
        .get(tonguetwister.readBylanguage)
    ;
}