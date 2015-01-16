# decaf-jolt-rest
RESTful API made easy for Jolt

This module provides an verb handler for Jolt to provide RESTful WWW services.

Please see the [decaf-jolt repo](https://github.com/decafjs/decaf-jolt) for full information about Jolt.

Typical usage:

```javascript
var Application  = require('decaf-jolt').Application,
    RestServer   = require('decaf-jolt-rest').RestServer,
    app          = new Application();

app.verb('v1', new RestServer({
    user : 'api/v1/user.sjs' // REST handlers for /v1/user route,
    comment: 'api/v1/comment.sjs' // REST handlers fro /v1/comment route
}));
```

The Jolt verb, in this example "v1", is expected to be the API version.  It is typical that over time, a company exposing RESTful interface creates entirely new API versions and exposes the new one and the old one for backward compatibility.  

The argument to the RestServer constructor is a hash of resource to handlers as .sjs programs. In this case, all URLs of the form

```/v1/user[/args]``` is handled by api/v1/user.sjs

and

```/v1/comment[/args]``` is handled by api/v1/comment.sjs

The .sjs programs return a hash object of HTTP request methods (e.g. 'GET', 'POST', 'PUT') mapped to functions to handle those request types.  The handler functions are passed the remaining arguments from the URL string, and the "this" value is an object with req, res, and a send() function menber.  

The send function takes two arguments: status and a string or object to send to the client.  It is typically used to send the response for the RESTful request.

Consider an example user.sjs:

```javascript
var users = [],
	users[1] = { id: 1, name: 'Mike Schwartz' };

return {
	// handles GET request for URL /v1/user/:id and /v1/user  (no id)
	'GET': function(id) {
		// if id is undefined, we should return a list of users here
		if (!id) {
			this.send(200, users);
		}
		else if (users[id]) {
			this.send(200, users[id]);
		}
		else {
			this.send(404, { message: 'User ' + id + ' not found' });
		}
	},
	// handles POST request for URL /v1/user
	'POST': function() {
		var newuser = this.req.post;
		users[newUser.id] = newUser;
		this.send(200, { message: 'User ' + id + ' created' });
	},
	'DELETE' : function(id) {
		if (!id) {
			throw new Error('Invalid arguments');
		}
		if (!users[id]) {
			this.send(404, { message: 'User ' + id + ' not found' });
		}
		else {
			delete users[id];
			this.send(200, { message: 'User ' + id + ' deleted' });
		}
	}
};
```

Note that not all HTTP request methods are handled or are required to be handled.  If the requested method does not have a handler installed, a 400/Bad Request response is automatically generated.

Also note that in the DELETE handler, an Error with message 'Invalid arguments' is thrown.  This is caught by RestServer and a 400/Bad Request with the Error's message is sent.

If you prefer to provide your own Bad Request handler, you can pass the function as the second argument to the RestServer constructor:

```javascirpt
function myBadRequestHandler(res, message) {
	res.send(400, { message: 'Bad Request' });
}

app.verb({ users: 'api/v1/users.sjs' }, myBadRequestHandler);

```
