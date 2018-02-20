module.exports = function(app) {
    const language = require('../controllers/languageController');

    app.route('/api/language')
        .get(language.readAll)
        .post(language.create)
    ;
    app.route('/api/language/:languageId')
        .get(language.read)
        .put(language.update)
        .delete(language.delete)
    ;
}