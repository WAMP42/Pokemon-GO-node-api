'use strict';

var login_url = 'https://sso.pokemon.com/sso/login?service=https%3A%2F%2Fsso.pokemon.com%2Fsso%2Foauth2.0%2FcallbackAuthorize';
var login_oauth = 'https://sso.pokemon.com/sso/oauth2.0/accessToken';

// Google Parts
var android_id = '9774d56d682e549c';
var oauth_service = 'audience:server:client_id:848232511240-7so421jotr2609rmqakceuu1luuq0ptb.apps.googleusercontent.com';
var app = 'com.nianticlabs.pokemongo';
var client_sig = '321187995bc7cdc2b5fc91b11a96e2baa8602c62';

module.exports = {
    PokemonClub: function (user, pass, self, callback) {
        var options = {
            url: login_url,
            headers: {
                'User-Agent': 'niantic'
            }
        };

        self.request.get(options, function (err, response, body) {
            var data;

            if (response && response.statusCode == 500) {
                err = new Error('CAS is Unavailable');
                err.statusCode = response.statusCode;
            }

            if (err) {
                return callback(err, null);
            }

            try {
                data = JSON.parse(body);
            } catch (err) {
                return callback(err, null);
            }

            options = {
                url: login_url,
                form: {
                    'lt': data.lt,
                    'execution': data.execution,
                    '_eventId': 'submit',
                    'username': user,
                    'password': pass
                },
                headers: {
                    'User-Agent': 'niantic'
                }
            };

            self.request.post(options, function (err, response, body) {
                //Parse body if any exists, callback with errors if any.
                if(err) {
                    return callback(err, null);
                }

                if (body) {
                    var parsedBody = JSON.parse(body);
                    if (parsedBody.errors && parsedBody.errors.length !== 0) {
                        return callback(new Error(parsedBody.errors[0]), null);
                    }
                }

                var ticket = response.headers['location'].split('ticket=')[1];

                options = {
                    url: login_oauth,
                    form: {
                        'client_id': 'mobile-app_pokemon-go',
                        'redirect_uri': 'https://www.nianticlabs.com/pokemongo/error',
                        'client_secret': 'w8ScCUXJQc6kXKw8FiOhd8Fixzht18Dq3PEVkUCP5ZPxtgyWsbTvWHFLm2wNY0JR',
                        'grant_type': 'refresh_token',
                        'code': ticket
                    },
                    headers: {
                        'User-Agent': 'niantic'
                    }
                };

                self.request.post(options, function (err, response, body) {
                    var token, expireTime;

                    if(err) {
                        return callback(err, null);
                    }

                    body = body.split('&');
                    token = body[0].split('token=')[1];
                    expireTime = body[1].split('expires=')[1];

                    if (!token || !expireTime) {
                        return callback(new Error('Login failed'), null);
                    }

                    self.DebugPrint('[i] Session token: ' + token);
                    callback(null, {token: token, expire_time: expireTime});
                });

            });

        });
    },
    GoogleAccount: function (user, pass, self, callback) {
        self.google.login(user, pass, android_id, function (err, data) {
            if (data) {
                self.google.oauth(user, data.masterToken, data.androidId, oauth_service, app, client_sig, function (err, data) {
                    if (err) {
                        return callback(err, null);
                    }
                    callback(null, {token: data.Auth, expire_time: data.Expiry});
                });
            }
            else {
                return callback(err, null);
            }
        });
    }
};
