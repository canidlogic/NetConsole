"use strict";

/*
 * console_boot.js
 * ===============
 * 
 * Defines a function "bootConsole()" in the global "window" object that
 * takes no parameters and returns a NetConsoleServer instance that will
 * be used as the initial server for the console client.
 */

window.bootConsole = function() {
  // TODO: Return an instance of your NetConsoleServer subclass here
  return new EchoServer();
};
