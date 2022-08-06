"use strict";

/*
 * NetConsoleServer.js
 * ===================
 * 
 * Definition of the NetConsoleServer abstract superclass.
 * 
 * This represents a server that can respond to client messages that are
 * sent from the console.
 * 
 * All the function implementations in this module will just throw an
 * exception, except for the constructor, which does nothing.  It is up
 * to subclass implementations to override and fill in the required
 * functionality.
 * 
 * Example subclass implementation
 * -------------------------------
 * 
 *  // Subclass constructor
 *  function ExampleServer([...]) {
 *    // Invoke superclass constructor
 *    NetConsoleServer.apply(this, arguments);
 * 
 *    // Subclass-specific constructor
 *    [...]
 *  }
 *  
 *  // Chain prototype
 *  ExampleServer.prototype = Object.create(NetConsoleServer.prototype);
 *  ExampleServer.prototype.constructor = ExampleServer;
 *  
 *  // Override superclass functions
 *  // Do NOT call superclass methods because those throw exceptions
 *  
 *  ExampleServer.prototype.handleInit = function(ctx) {
 *    [...]
 *  };
 *  
 *  ExampleServer.prototype.handleMessage = function(ctx, msg) {
 *    [...]
 *  };
 */

/*
 * new NetConsoleServer()
 * ----------------------
 * 
 * Does nothing.
 * 
 * You will want to construct subclasses, not this abstract superclass.
 * See the module documentation for further information.
 */
function NetConsoleServer() {
  // Do nothing
}

/*
 * obj.handleInit(ctx)
 * -------------------
 * 
 * This function must be called exactly once before any messages can be
 * handled.  It allows the server to write messages to the console and
 * set it up as desired.
 * 
 * Pass a concrete implementation of NetConsoleClient to allow the
 * server to write messages.  This instance will only be used during the
 * initialization processing.
 * 
 * This function might return immediately without actually finishing the
 * initialization.  The complete() function of ctx will be called when
 * initialization is complete.
 * 
 * Parameters:
 * 
 *   ctx : NetConsoleClient - context used for client output and to call
 *   to indicate initialization is complete
 */
NetConsoleServer.prototype.handleInit = function(ctx) {
  throw "NetConsoleServer.handleInit() is abstract";
};

/*
 * obj.handleMessage(ctx, msg)
 * ---------------------------
 * 
 * Call this funtion to handle a message that the client is sending to
 * the server.
 * 
 * Pass a concrete implementation of NetConsoleClient to allow the
 * server to write messages.  This instance will only be used during
 * processing this message.
 * 
 * This function might return immediately without actually finishing
 * processing the message.  The complete() function of ctx will be
 * called when message processing is complete.
 * 
 * You may not call handleMessage() until handleInit() has invoked the
 * complete callback.  You may also not call handleMessage() while
 * another message is being handled but has not yet called the complete
 * callback.
 * 
 * Parameters:
 * 
 *   ctx : NetConsoleClient - context used for client output and to call
 *   to indicate processing is complete
 * 
 *   msg : string - the message that the client is sending to the server
 */
NetConsoleServer.prototype.handleMessage = function(ctx, msg) {
  throw "NetConsoleServer.handleMessage() is abstract";
};
