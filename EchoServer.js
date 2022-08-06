"use strict";

/*
 * EchoServer.js
 * =============
 * 
 * Example subclass of NetConsoleServer that simply echoes client
 * messages back to the client.
 * 
 * Requires:
 * 
 * - NetConsoleServer.js
 * - NetConsoleClient.js
 */

// Constructor
function EchoServer() {
  // Invoke superclass constructor
  NetConsoleServer.apply(this, arguments);
}

// Chain prototype
EchoServer.prototype = Object.create(NetConsoleServer.prototype);
EchoServer.prototype.constructor = EchoServer;

// Override superclass functions

EchoServer.prototype.handleInit = function(ctx) {
  ctx.cls();
  ctx.print("Welcome to the echo server!");
  ctx.print("This server will echo your messages back to you.");
  ctx.print("Send 'login' to try out a login session.");
  ctx.complete();
};

EchoServer.prototype.handleMessage = function(ctx, msg) {
  if (msg === "login") {
    ctx.showLogin(
          "EchoServer Example",
          function(sUser, sPass) {
            ctx.print("You logged in.");
            ctx.print("Username: " + sUser);
            ctx.print("Password:");
            ctx.token(sPass);
            ctx.complete();
          },
          function() {
            ctx.print("Login was cancelled.");
            ctx.complete();
          });
    
  } else {
    ctx.print("You said:\u000a" + msg);
    ctx.complete();
  }
};
