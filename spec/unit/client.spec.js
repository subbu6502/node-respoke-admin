'use strict';
var helpers = require('../helpers');
var Respoke = require('../../index');
var should = require('should');
var uuid = require('uuid');
var nock = require('nock');
var errors = require('../../lib/utils/errors');

describe('respoke', function () {
    var respoke;
    var nocked;
    var baseDomain = 'http://respoke.test';
    var baseURL = baseDomain + '/v1';

    before(function () {
        nocked = nock(baseDomain);
        nock.disableNetConnect(baseDomain);
    });

    describe('Base methods and properties', function () {
        before(function () {
            respoke = new Respoke({
                baseURL: baseURL
            });
        });

        it('has request', function () {
            respoke.request.should.be.a.Function;
        });

        it('has wsCall', function () {
            respoke.wsCall.should.be.a.Function;
        });

        it('is an EventEmitter', function () {
            respoke.on.should.be.a.Function;
            respoke.emit.should.be.a.Function;
        });

        it('has expected properties', function () {
            respoke.tokens.should.be.an.Object;
            (respoke.connectionId === null).should.be.ok;
            (respoke.socket === null).should.be.ok;
            respoke.baseURL.should.be.a.String;
            respoke.baseURL.should.not.be.empty;

            respoke.auth.should.be.an.Object;
            respoke.groups.should.be.an.Object;
            respoke.messages.should.be.an.Object;
            respoke.roles.should.be.an.Object;
            respoke.apps.should.be.an.Object;
            respoke.presence.should.be.an.Object;
            });
    });

    describe('auth', function () {
        describe('endpoint', function () {
            before(function () {
                respoke = new Respoke({
                    baseURL: baseURL
                });
            });

            it('requires an appId', function (done) {
                respoke.auth.endpoint({}, function (err) {
                    should.exist(err);
                    err.message.should.match(/appId is null/);
                    done();
                });
            });

            it('requires an endpointId', function (done) {
                respoke.auth.endpoint(
                    { appId: uuid.v4() },
                    function (err) {
                        should.exist(err);
                        err.message.should.match(/endpointId is null/);
                        done();
                    }
                );
            });

            describe('when there is no http error', function () {
                var expectedData = 'booya';

                beforeEach(function () {
                    nocked
                        .post('/v1/tokens')
                        .reply(200, expectedData);
                });

                it('returns data to callback', function (done) {
                    respoke.auth.endpoint({
                        appId: uuid.v4(),
                        endpointId: uuid.v4()
                    }, function (err, data) {
                        should.not.exist(err);
                        data.should.equal(expectedData);
                        done();
                    });
                });

                it('resolves promise with data', function (done) {
                    respoke.auth.endpoint({
                        appId: uuid.v4(),
                        endpointId: uuid.v4()
                    }).then(function (data) {
                        data.should.equal(expectedData);
                        done();
                    });
                });
            });

            describe('when there is an http error', function () {
                beforeEach(function () {
                    nocked
                        .post('/v1/tokens')
                        .reply(500);
                });

                it('returns error to callback', function (done) {
                    respoke.auth.endpoint({
                        appId: uuid.v4(),
                        endpointId: uuid.v4()
                    }, function (err) {
                        should.exist(err);
                        err.should.be.an.instanceof(errors.UnexpectedServerResponseError);
                        done();
                    });
                });

                it('rejects promise with error', function (done) {
                    respoke.auth.endpoint({
                        appId: uuid.v4(),
                        endpointId: uuid.v4()
                    }).catch(function (err) {
                        should.exist(err);
                        err.should.be.an.instanceof(errors.UnexpectedServerResponseError);
                        done();
                    });
                });
            });
        });

        describe('sessionToken', function () {
            var tokenId = uuid.v4();

            before(function () {
                respoke = new Respoke({
                    baseURL: baseURL
                });
            });

            beforeEach(function () {
                respoke.tokens['App-Token'] = null;
            });

            it('requires a tokenId', function (done) {
                respoke.auth.sessionToken({}, function (err) {
                    should.exist(err);
                    err.message.should.match(/tokenId/);
                    done();
                });
            });

            describe('when there is no http error', function () {
                var expectedData = { token: 'booya' };

                beforeEach(function () {
                    nocked
                        .post('/v1/session-tokens', {
                            tokenId: tokenId
                        })
                        .reply(200, expectedData);
                });

                it('returns data to callback', function (done) {
                    respoke.auth.sessionToken({
                        tokenId: tokenId
                    }, function (err, data) {
                        should.not.exist(err);
                        should.exist(data.token);
                        data.token.should.equal(expectedData.token);
                        respoke.tokens['App-Token']
                            .should.equal(expectedData.token);
                        done();
                    });
                });

                it('resolves promise with data', function (done) {
                    respoke.auth.sessionToken({
                        tokenId: tokenId
                    }).then(function (data) {
                        should.exist(data.token);
                        data.token.should.equal(expectedData.token);
                        respoke.tokens['App-Token']
                            .should.equal(expectedData.token);
                        done();
                    });
                });
            });

            describe('when there is an http error', function () {
                beforeEach(function () {
                    nocked
                        .post('/v1/session-tokens', {
                            tokenId: tokenId
                        })
                        .reply(500);
                });

                it('returns error to callback', function (done) {
                    respoke.auth.sessionToken({
                        tokenId: tokenId
                    }, function (err) {
                        should.exist(err);
                        err.should.be.an.instanceof(errors.UnexpectedServerResponseError);
                        should.not.exist(respoke.tokens['App-Token']);
                        done();
                    });
                });

                it('rejects promise with error', function (done) {
                    respoke.auth.sessionToken({
                        tokenId: tokenId
                    }).catch(function (err) {
                        should.exist(err);
                        err.should.be.an.instanceof(errors.UnexpectedServerResponseError);
                        should.not.exist(respoke.tokens['App-Token']);
                        done();
                    });
                });
            });
        });

        describe('admin', function () {
            var tokenId = uuid.v4();
            var loginCreds = {
                username: 'ping',
                password: 'pong'
            };

            before(function () {
                respoke = new Respoke({
                    baseURL: baseURL
                });
            });

            beforeEach(function () {
                respoke.tokens['Admin-Token'] = null;
            });

            it('requires a username', function (done) {
                respoke.auth.admin({}, function (err) {
                    should.exist(err);
                    err.message.should.match(/username/);
                    done();
                });
            });

            it('requires a password', function (done) {
                respoke.auth.admin({ username: 'zoom' }, function (err) {
                    should.exist(err);
                    err.message.should.match(/password/);
                    done();
                });
            });

            describe('when there is no http error', function () {
                var expectedData = { token: 'booya' };

                beforeEach(function () {
                    nocked
                        .post('/v1/adminsessions', loginCreds)
                        .reply(200, expectedData);
                });

                it('returns data to callback', function (done) {
                    respoke.auth.admin(loginCreds, function (err, data) {
                        should.not.exist(err);
                        should.exist(data.token);
                        data.token.should.equal(expectedData.token);
                        respoke.tokens['Admin-Token']
                            .should.equal(expectedData.token);
                        done();
                    });
                });

                it('resolves promise with data', function (done) {
                    respoke.auth.admin(loginCreds).then(function (data) {
                        should.exist(data.token);
                        data.token.should.equal(expectedData.token);
                        respoke.tokens['Admin-Token']
                            .should.equal(expectedData.token);
                        done();
                    });
                });
            });

            describe('when there is an http error', function () {
                beforeEach(function () {
                    nocked
                        .post('/v1/adminsessions', loginCreds)
                        .reply(500);
                });

                it('returns error to callback', function (done) {
                    respoke.auth.admin(loginCreds, function (err) {
                        should.exist(err);
                        err.should.be.an.instanceof(errors.UnexpectedServerResponseError);
                        should.not.exist(respoke.tokens['Admin-Token']);
                        done();
                    });
                });

                it('rejects promise with error', function (done) {
                    respoke.auth.admin(loginCreds).catch(function (err) {
                        should.exist(err);
                        err.should.be.an.instanceof(errors.UnexpectedServerResponseError);
                        should.not.exist(respoke.tokens['Admin-Token']);
                        done();
                    });
                });
            });
        });
    });

    describe('apps get', function () {
        before(function () {
            respoke = new Respoke({
                baseURL: baseURL,
                'App-Token': uuid.v4()
            });
        });

        describe('with appId', function () {
            var params = {
                appId: uuid.v4()
            };

            describe('when there is no http error', function () {
                var expectedData = 'booya';

                beforeEach(function () {
                    nocked
                        .get('/v1/apps/' + params.appId)
                        .reply(200, expectedData);
                });

                it('returns data to callback', function (done) {
                    respoke.apps.get(params, function (err, data) {
                        should.not.exist(err);
                        should.exist(data);
                        data.should.equal(expectedData);
                        done();
                    });
                });

                it('resolves promise with data', function (done) {
                    respoke.apps.get(params).then(function (data) {
                        should.exist(data);
                        data.should.equal(expectedData);
                        done();
                    });
                });
            });

            describe('when there is an http error', function () {
                beforeEach(function () {
                    nocked
                        .get('/v1/apps/' + params.appId)
                        .reply(500);
                });

                it('returns error to callback', function (done) {
                    respoke.apps.get(params, function (err) {
                        should.exist(err);
                        err.should.be.an.instanceof(errors.UnexpectedServerResponseError);
                        done();
                    });
                });

                it('rejects promise with error', function (done) {
                    respoke.apps.get(params).catch(function (err) {
                        should.exist(err);
                        err.should.be.an.instanceof(errors.UnexpectedServerResponseError);
                        done();
                    });
                });
            });
        });

        describe('without appId', function () {
            var params = {
                appId: uuid.v4()
            };

            describe('when there is no http error', function () {
                var expectedData = 'booya';

                beforeEach(function () {
                    nocked
                        .get('/v1/apps')
                        .reply(200, expectedData);
                });

                it('returns data to callback', function (done) {
                    respoke.apps.get(function (err, data) {
                        should.not.exist(err);
                        should.exist(data);
                        data.should.equal(expectedData);
                        done();
                    });
                });

                it('resolves promise with data', function (done) {
                    respoke.apps.get().then(function (data) {
                        should.exist(data);
                        data.should.equal(expectedData);
                        done();
                    });
                });
            });

            describe('when there is an http error', function () {
                beforeEach(function () {
                    nocked
                        .get('/v1/apps')
                        .reply(500);
                });

                it('returns error to callback', function (done) {
                    respoke.apps.get(function (err) {
                        should.exist(err);
                        err.should.be.an.instanceof(errors.UnexpectedServerResponseError);
                        done();
                    });
                });

                it('rejects promise with error', function (done) {
                    respoke.apps.get().catch(function (err) {
                        should.exist(err);
                        err.should.be.an.instanceof(errors.UnexpectedServerResponseError);
                        done();
                    });
                });
            });
        });
    });

    describe('roles', function () {
        before(function () {
            respoke = new Respoke({
                baseURL: baseURL,
                'App-Token': uuid.v4()
            });
        });

        describe('get', function () {
            it('requires an appId', function (done) {
                respoke.roles.get({}, function (err) {
                    should.exist(err);
                    err.message.should.match(/appId is required/);
                    done();
                });
            });

            describe('with roleId', function () {
                var params = {
                    appId: uuid.v4(),
                    roleId: uuid.v4()
                };

                describe('when there is no http error', function () {
                    var expectedData = 'booya';

                    beforeEach(function () {
                        nocked
                            .get(
                                '/v1/roles/' + params.roleId +
                                '?appId=' + params.appId
                            )
                            .reply(200, expectedData);
                    });

                    it('returns data to callback', function (done) {
                        respoke.roles.get(params, function (err, data) {
                            should.not.exist(err);
                            should.exist(data);
                            data.should.equal(expectedData);
                            done();
                        });
                    });

                    it('resolves promise with data', function (done) {
                        respoke.roles.get(params).then(function (data) {
                            should.exist(data);
                            data.should.equal(expectedData);
                            done();
                        });
                    });
                });

                describe('when there is an http error', function () {
                    beforeEach(function () {
                        nocked
                            .get(
                                '/v1/roles/' + params.roleId +
                                '?appId=' + params.appId
                            )
                            .reply(500);
                    });

                    it('returns error to callback', function (done) {
                        respoke.roles.get(params, function (err) {
                            should.exist(err);
                            err.should.be.an.instanceof(errors.UnexpectedServerResponseError);
                            done();
                        });
                    });

                    it('rejects promise with error', function (done) {
                        respoke.roles.get(params).catch(function (err) {
                            should.exist(err);
                            err.should.be.an.instanceof(errors.UnexpectedServerResponseError);
                            done();
                        });
                    });
                });
            });

            describe('without roleId', function () {
                var params = {
                    appId: uuid.v4()
                };

                describe('when there is no http error', function () {
                    var expectedData = 'booya';

                    beforeEach(function () {
                        nocked
                            .get('/v1/roles?appId=' + params.appId)
                            .reply(200, expectedData);
                    });

                    it('returns data to callback', function (done) {
                        respoke.roles.get(params, function (err, data) {
                            should.not.exist(err);
                            should.exist(data);
                            data.should.equal(expectedData);
                            done();
                        });
                    });

                    it('resolves promise with data', function (done) {
                        respoke.roles.get(params).then(function (data) {
                            should.exist(data);
                            data.should.equal(expectedData);
                            done();
                        });
                    });
                });

                describe('when there is an http error', function () {
                    beforeEach(function () {
                        nocked
                            .get('/v1/roles?appId=' + params.appId)
                            .reply(500);
                    });

                    it('returns error to callback', function (done) {
                        respoke.roles.get(params, function (err) {
                            should.exist(err);
                            err.should.be.an.instanceof(errors.UnexpectedServerResponseError);
                            done();
                        });
                    });

                    it('rejects promise with error', function (done) {
                        respoke.roles.get(params).catch(function (err) {
                            should.exist(err);
                            err.should.be.an.instanceof(errors.UnexpectedServerResponseError);
                            done();
                        });
                    });
                });
            });
        });

        describe('create', function () {
            var role = {
                appId: uuid.v4(),
                name: 'foo-bar'
            };

            it('requires an appId', function (done) {
                respoke.roles.create({}, function (err) {
                    should.exist(err);
                    err.message.should.match(/appId is undefined/);
                    done();
                });
            });

            it('requires an name', function (done) {
                respoke.roles.create({
                    appId: uuid.v4()
                }, function (err) {
                    should.exist(err);
                    err.message.should.match(/name is undefined/);
                    done();
                });
            });

            describe('when there is no http error', function () {
                var expectedData = 'booya';

                beforeEach(function () {
                    nocked
                        .post('/v1/roles')
                        .reply(200, expectedData);
                });

                it('returns data to callback', function (done) {
                    respoke.roles.create(role, function (err, data) {
                        should.not.exist(err);
                        should.exist(data);
                        data.should.equal(expectedData);
                        done();
                    });
                });

                it('resolves promise with data', function (done) {
                    respoke.roles.create(role).then(function (data) {
                        should.exist(data);
                        data.should.equal(expectedData);
                        done();
                    });
                });
            });

            describe('when there is an http error', function () {
                beforeEach(function () {
                    nocked
                        .post('/v1/roles')
                        .reply(500);
                });

                it('returns error to callback', function (done) {
                    respoke.roles.create(role, function (err) {
                        should.exist(err);
                        err.should.be.an.instanceof(errors.UnexpectedServerResponseError);
                        done();
                    });
                });

                it('rejects promise with error', function (done) {
                    respoke.roles.create(role).catch(function (err) {
                        should.exist(err);
                        err.should.be.an.instanceof(errors.UnexpectedServerResponseError);
                        done();
                    });
                });
            });
        });

        describe('delete', function () {
            var params = {
                roleId: uuid.v4()
            };

            it('requires an roleId', function (done) {
                respoke.roles.delete({}, function (err) {
                    should.exist(err);
                    err.message.should.match(/roleId is undefined/);
                    done();
                });
            });

            describe('when there is no http error', function () {
                var expectedData = 'booya';

                beforeEach(function () {
                    nocked
                        .delete('/v1/roles/' + params.roleId)
                        .reply(200, expectedData);
                });

                it('returns data to callback', function (done) {
                    respoke.roles.delete(params, function (err, data) {
                        should.not.exist(err);
                        should.exist(data);
                        data.should.equal(expectedData);
                        done();
                    });
                });

                it('resolves promise with data', function (done) {
                    respoke.roles.delete(params).then(function (data) {
                        should.exist(data);
                        data.should.equal(expectedData);
                        done();
                    });
                });
            });

            describe('when there is an http error', function () {
                beforeEach(function () {
                    nocked
                        .delete('/v1/roles/' + params.roleId)
                        .reply(500);
                });

                it('returns error to callback', function (done) {
                    respoke.roles.delete(params, function (err) {
                        should.exist(err);
                        err.should.be.an.instanceof(errors.UnexpectedServerResponseError);
                        done();
                    });
                });

                it('rejects promise with error', function (done) {
                    respoke.roles.delete(params).catch(function (err) {
                        should.exist(err);
                        err.should.be.an.instanceof(errors.UnexpectedServerResponseError);
                        done();
                    });
                });
            });
        });
    });

});
