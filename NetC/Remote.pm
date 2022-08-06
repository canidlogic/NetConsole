package NetC::Remote;
use strict;

=head1 NAME

NetC::Remote - Implement a remote server for NetConsole.

=head1 SYNOPSIS

  use NetC::Remote;
  
  # Get a new instance
  my $rs = NetC::Remote->load($db_path, $session_time);
  
  # Handle opening CGI
  $rs->cgi();
  
  # Handle the specific requested operation
  if ($rs->procType eq 'nop') {
    # No-operation, so do nothing
  
  } elsif ($rs->procType eq 'hello') {
    # Initial context setup and initial message printing
    ...
    
  } elsif ($rs->procType eq 'message') {
    # Received a message from the client
    my $data = $rs->messageData();
    ...
  
  } elsif ($rs->procType eq 'credential') {
    # Received response to credential request from the client
    if (not $rs->hasCancel) {
      my $username = $rs->nameCred;
      my $password = $rs->passCred;
      ...
    }
  
  } elsif ($rs->procType eq 'resume') {
    # Received resume message from the client
    if (not $rs->hasCancel) {
      ...
    }
  
  } elsif ($rs->procType eq 'logout') {
    # Received logout request from the client
    ...
  }
  
  # You can always read variables from the database
  my $var_value = $rs->var("varname");
  
  # For all but "nop", you can get the current username and whether they
  # are an administrator
  my $current_user = $rs->currentUser;
  if ($rs->isAdministrator) {
    ...
  }
  
  # For all but "nop", you can read and write the context
  my $ctx = $rs->context;
  $rs->context($ctx);
  
  # For all but "nop" and "logout", you can change client display
  $rs->consoleCls();
  $rs->consolePrint("Message from server");
  $rs->consoleToken("Example token");
  
  # For all but "nop" and "logout", you can get and set client mode
  my $mode = $rs->clientMode;
  $rs->clientMode('prompt');
  $rs->clientMode('ask', 'Example site name');
  $rs->clientMode('begin');
  $rs->clientMode('proceed');
  
  # When you are done, send the response back to the client
  $rs->complete();

=head1 DESCRIPTION

Remote servers for NetConsole are CGI scripts that respond to POST
requests in secure HTTPS context according to a specific remote
NetConsole protocol.  This protocol allows the remote CGI script running
on the server to appear like any other kind of server on the client-side
NetConsole client.

This module handles all the details of CGI handling and the remote
NetConsole protocol.  This allows you to rapidly develop your own custom
remote NetConsole servers that run server-side.

The basic outline of a remote NetConsole server is shown in the
synopsis.  You begin by constructing an instance of C<NetC::Remote>
using the C<load> constructor.  Then, you call the C<cgi> instance
function.  This function will handle receiving a request from the client
over CGI and handling remote NetConsole protocol details.  After that
function returns, you perform your specific handling by making use of
the state of the C<NetC::Remote> object instance.  Finally, you call the
C<complete> function of the object instance to send the CGI response
back to the client.

Since this all runs in a single CGI transaction, you should make sure
that your server handling never takes too much time.  If you have a long
operation, you should split it somehow into multiple steps each of a
reasonable length for a CGI request, and then use the C<begin> and
C<proceed> modes of the remote NetConsole protocol to split processing
across multiple invocations of the CGI script.

=head2 Built-in message support

Certain messages that the user sends are either handled on the client
side, or by C<NetC::Remote>.  These built-in messages therefore do not
need to be implemented by remote NetConsole servers.

All built-in messages begin with an optional sequence of spaces, tabs,
and line breaks, followed by a case-insensitive I<special word>,
followed by a space, tab, line break, or the end of the message.

The special words are C<logout> C<admin> and C<cls>.  The C<logout>
command is handled on the client-side.  It causes the client to send an
explicit log-out message to the remote NetConsole server to end the
session.  The C<cls> command is also handled on the client-side.  It
causes the client's console to be blanked.  Neither or these messages
may contain anything but the special word (except for optional leading
and trailing whitespace).

The special word C<admin> is transmitted regularly to the NetConsole
server, but C<NetC::Remote> will handle these messages by itself and
then give the server implementation a C<nop> process type.

The following C<admin> commands are available:

  admin setpass
  admin user list
  admin user demote
  admin user promote
  admin user rename
  admin user reset
  admin user drop
  admin user add
  admin var list
  admin var set
  admin var drop

The C<setpass> command is available to all users.  All the other
commands are only available to users who are marked as being
administrators.

Each of these commands will start a small interactive session that
guides the user through the specific process.  C<setpass> lets a user
change their own password.  The user has to log in three times, the
first with their current credentials and the second and third times with
their new credentials.  They may change the password, but not their
username.

The C<user list> command lets administrators see a list of all users,
their names, and their ranks.

The C<user demote> and C<user promote> commands let administrators
promote regular users to administrators, or demote other administrators
to regular users.  Administrators may not demote themselves.

The C<user rename> command allows administrators to change any user's
username, including their own.  Regular users are not allowed to rename
themselves.

The C<user reset> command allows administrators to set a new password
for a given regular user or other administrator.  This process will also
forcibly close any sessions currently active with that user.
Administrators may not reset themselves.

The C<user drop> command allows administrators to delete any regular
user or other administrator.  Administrators may not drop themselves.

The C<user add> command allows administrators to add a new user with a
given username and password.  The user starts out as a regular user.

The C<var list> command shows all the database variables and their
current values.

The C<var set> command updates a database variable value or adds a new
database value.

The C<var drop> command drops a database variable.

=head2 State description

The following subsections outline the different components of the state
of C<NetC::Remote> after the call to C<cgi()> but before the call to
C<complete()>.

=head3 Process type

The most fundamental part of the C<NetC::Remote> state that you will
make use of is the read-only C<procType> property.  This is a string
with one of the following values:

=over 4

=item C<nop>

No-operation.  The C<NetC::Remote> object is able to handle everything
about this request by itself.  Your script should just call the
C<complete> function without doing anything else.

=item C<hello>

Initial state setup.  This is always the first thing your server will
handle during a new session.  This only occurs once at the start of the
session (though it may be preceded by C<nop> transactions).  The
intention is for you to set up your context state (see later) in the
appropriate initial configuration, and also to send any console messages
to the user that should be displayed right away at the start of the
session.

=item C<message>

The client has sent you a message to process.  Use C<messageData> to get
the specific message that the client has sent.  It's completely up to
your server implementation to decide how to parse and respond to
messages.

=item C<credential>

The client has sent you a credential response that you previously
requested during this session by setting C<ask> as the C<clientMode>.
You should first check whether the client decided to cancel by checking
C<hasCancel>.  If the client did not cancel, you can use the functions
C<nameCred> and C<passCred> to get the username and password that the
client entered.

=item C<resume>

The client automatically invoked the server again because you previously
during this session set the C<clientMode> to C<begin> or C<proceed>.
This is intended to support operations that are too long to complete
during a single CGI transaction.  You can split these long operations
into separate steps and then use C<begin> and C<proceed> to cause the
client to keep calling the server back until you've completed the long
operation.

The client may signal that the user wants to cancel the operation.  Use
the C<hasCancel> function to check whether there has been a request to
cancel.  You may ignore the cancel request if you wish, or delay acting
on it until later.

The only difference between C<begin> and C<proceed> client modes is that
C<begin> resets the cancel flag to clear, while C<proceed> keeps the
cancel flag in its current state.

=item C<logout>

The client has explicitly requested a log-out operation.  You can try to
clean up the session here.  However, note that it's also possible for
the client to just time-out the session, in which case the session will
end without C<logout> being processed.  In other words, if you put
clean-up processing here, you can I<not> depend on it actually being run
at the end of each session.

=back

=head3 Database variables

In all transactions, you have read-only access to I<database variables>.
This is a key/value string map that is stored within the same database
that holds user and session information.  Administrators can alter these
database variables using built-in commands described earlier.

Database variables can be used by the remote NetConsole server
implementation to store configuration information.  Use the C<var>
function to access configuration variables.

=head3 User information

In all transactions, you have read-only access to the name of the user
logged into this session and whether that user is an administrator.
However, this information is not available when C<procType> is C<nop>.
Use C<currentUser> to get the current username and C<isAdministrator> to
check whether the current user has administrator privileges.

=head3 Context

In all transactions, you will have read/write access to C<context>,
except when C<procType> is C<nop>.  At the start of a session when
C<procType> is C<hello>, the context will always just be an empty
string.  At the start of any other transaction during a session, the
context will be the same as it was at the end of the previous CGI
transaction.  This allows you to maintain session state across multiple
independent CGI transactions.  You can, for example, serialize complex
state into JSON and store the JSON into the context.

Since this context will be sent back to the client, never put any
secrets that should remain on the server into the context.

The idea of context is similar in spirit to cookies, but there are a
number of advantages to contexts.

Most importantly, the remote NetConsole protocol secures contexts with
an HMAC-MD5 using a session-unique and constantly changing secret key
that never leaves the server.  This prevents clients from tampering with
the context, because they have no way of recomputing the HMAC-MD5 for
the tampered context without knowing the constantly changing secret key
that is kept on the server.

Furthermore, the secret key used for the HMAC-MD5 is changed after each
individual CGI transaction during a session.  This prevents two
different clients from being in the same session, even if they are
somehow forked from each other, because the next key change will kick
one of the clients out.

Finally, contexts do not rely on client cookie or client-side storage
mechanisms, so they are free from the various quirks and limitations of
those technologies.

=head3 Display commands

In all transactions except C<nop> and C<logout>, you can send commands
back to the client that will cause the client console to be updated with
new information to display to the user.  All of these display commands
are buffered during the CGI transaction and then sent back to the client
during the response.  The client will then execute all of the buffered
display commands in the order they were given.

The first display command is C<consolePrint()>, which prints a message
to the client.

The second display command is C<consoleCls()>, which clears the client's
console to blank.

The third display command is C<consoleToken()>, which provides a token
for the client.  The token is not directly displayed on the screen.
Instead, the client will be provided with a "Copy to clipboard" button
or link, and activating that will copy the text contents of the token to
the clipboard.

=head3 Client mode

In all transactions except C<nop> and C<logout>, the server response
will indicate a I<mode> for the client to operate in.  The default mode
is C<prompt>, which will always be returned unless C<clientMode()> is
explicitly used to change the client mode to something else.  In this
default mode, the client is free to send any sort of message to the
server.

If the mode is changed to C<ask>, then the client will prompt the user
to enter a username and password.  The password will be requested in an
appropriate password input control.  Along with this mode designation,
you must also provide a site parameter which identifies to the user the
specific location they are providing credentials for.  The user can
either provide the credentials or cancel.  If there is another
transaction on this session, it will be a C<credential> process type,
which provides the results.

If the mode is changed to C<begin> or C<proceed>, then the client will
immediately make another request to the server with a C<resume> process
type.  This allows long operations to be split across multiple
transactions, in cases where performing everything in a single
transaction would be too long for a single CGI process.

The user is allowed to request in C<begin> or C<proceed> mode that the
operation be cancelled, though the server is not required to honor this
request.  The C<resume> process type has C<hasCancel> which indicates
whether the user has requested the operation be stopped.

You may only use C<proceed> immediately after a transaction where you
returned C<begin> or C<proceed>.  You may use C<begin> at any time.  The
C<begin> client mode reset the client's cancel flag to clear, while the
C<proceed> client mode will not affect the state of the cancel flag.

=head3 Process-specific state

Certain state is specific to certain process types.

In the C<message> process type only, C<messageData> returns the message
that the client provided.

In the C<credential> process type only, C<nameCred> and C<passCred>
store the username and password that were submitted.  However, these are
not available if C<hasCancel> is true.

In C<credential> and C<resume> process types, C<hasCancel> indicates
whether the user cancelled the action.  For C<credential> process type,
the cancel can't be ignored because the user refused to enter a username
and password.  For the C<resume> process type, the server is not
required to honor the cancel request, and the server can also choose to
delay responding to the cancel request.

=head1 CONSTRUCTOR

=over 4

=item B<load($db_path, $session_time)>

Construct a new C<NetC::Remote> instance to manage a remote NetConsole
CGI transaction.

C<db_path> is the path to the SQLite database storing the user, session,
and variable information.  It must have been created with the 
C<netc_createdb.pl> script.

C<session_time> is the number of minutes until sessions time out due to
inactivity.  This must be an integer value that is greater than zero.
Each session has a timestamp that is updated each time there is a
transaction on that session.  Whenever the timestamp of a session is at
least C<session_time> minutes in the past, it may be freely closed down.

Each process is only allowed to construct a single instance of this
object.  Fatal error occurs if more than one is constructed.

=cut

sub load {
  # @@TODO:
}

=back

=head1 INSTANCE METHODS

=over 4

=item B<cgi()>

Receive a request from the client over CGI and initialize object state
so that the request can be processed by the server.

This function should be called after constructing the C<NetC::Remote>
object.  Since it reads standard input as part of CGI processing,
nothing except this object may touch standard input.

=cut

sub cgi {
  # @@TODO:
}

=item B<procType()>

Returns a string describing the type of processing that should be done
during this transaction.

This is only available between C<cgi()> and C<complete()>.  Otherwise, a
fatal error occurs.

The return value is one of the following string values:  C<nop> C<hello>
C<message> C<credential> C<resume> or C<logout>.  See the documentation
at the top of this module for the meaning of each.

=cut

sub procType {
  # @@TODO:
}

=item B<var($varname)>

Returns the string value of a configuration variable.

This is only available between C<cgi()> and C<complete()>.  Otherwise, a
fatal error occurs.

Both the variable name and the returned string value are Unicode
strings.  If a variable with the given name does not exist, C<undef> is
returned.

=cut

sub var {
  # @@TODO:
}

=item B<currentUser()>

Returns the username of the current user.

This is only available between C<cgi()> and C<complete()> and when the
C<procType> is not C<nop>.  Otherwise, a fatal error occurs.

The returned username is a Unicode string.

=cut

sub currentUser {
  # @@TODO:
}

=item B<isAdministrator()>

Returns whether the current user has administrator privileges.

This is only available between C<cgi()> and C<complete()> and when the
C<procType> is not C<nop>.  Otherwise, a fatal error occurs.

The returned value is 1 if the user is an administrator, 0 otherwise.

=cut

sub isAdministrator {
  # @@TODO:
}

=item B<context([$new_context])>

Get or set the current session context.

This is only available between C<cgi()> and C<complete()> and when the
C<procType> is not C<nop>.  Otherwise, a fatal error occurs.

The session context is always a B<binary> string.  At the start of a
session, the session context starts out as an empty string.  The session
context is sent to the client, so don't store any server secrets in the
context.

If called without any parameter, this function returns the current
context.  If called with a parameter, the parameter becomes the new
context.

=cut

sub context {
  # @@TODO:
}

=item B<consoleCls()>

Clear the client's console.

This is only available between C<cgi()> and C<complete()> and when the
C<procType> is not C<nop> and not C<logout>.  Otherwise, a fatal error
occurs.

This display command is not executed immediately.  Instead, it is
buffered along with all other display commands executed during a
transaction.  At the end of the transaction, the list of buffered
display commands are sent back to the client, and the client then runs
all the buffered display commands in order.

=cut

sub consoleCls {
  # @@TODO:
}

=item B<consolePrint($msg)>

Print a message to the client's console.  The given C<msg> is a Unicode
string.

This is only available between C<cgi()> and C<complete()> and when the
C<procType> is not C<nop> and not C<logout>.  Otherwise, a fatal error
occurs.

This display command is not executed immediately.  Instead, it is
buffered along with all other display commands executed during a
transaction.  At the end of the transaction, the list of buffered
display commands are sent back to the client, and the client then runs
all the buffered display commands in order.

=cut

sub consolePrint {
  # @@TODO:
}

=item B<consoleToken($tkstr)>

Add a token to the client's console.  A token is rendered as a button or
a link that the user can activate to copy the token text to the
clipboard.  The actual token text is not displayed.  C<tkstr> is the
token text, which is a Unicode string.

This is only available between C<cgi()> and C<complete()> and when the
C<procType> is not C<nop> and not C<logout>.  Otherwise, a fatal error
occurs.

This display command is not executed immediately.  Instead, it is
buffered along with all other display commands executed during a
transaction.  At the end of the transaction, the list of buffered
display commands are sent back to the client, and the client then runs
all the buffered display commands in order.

=cut

sub consoleToken {
  # @@TODO:
}

=item B<clientMode($new_mode[, $site_name])>

Set the client into a specific mode.

This is only available between C<cgi()> and C<complete()> and when the
C<procType> is not C<nop> and not C<logout>.  Otherwise, a fatal error
occurs.

At the start of each transaction, a default client mode of C<prompt> is
established and remains unless explicitly changed with this function.
The state of the client mode at the end of the transaction is all that
matters.

C<new_mode> is the client mode that should be set.  It must be one of
the string values C<prompt> C<ask> C<begin> or C<proceed>.  See the
documentation at the top of this module for the meaning of each.

For C<ask> only, you must also provide a C<site_name> parameter.  This
is a Unicode string that will be displayed to the client to indicate
what they are logging into.

=cut

sub clientMode {
  # @@TODO:
}

=item B<messageData()>

Get the message data that the client sent.

This is only available between C<cgi()> and C<complete()> and when the
C<procType> is C<message>.  Otherwise, a fatal error occurs.

The returned message data is a Unicode string.

Note that built-in messages that begin with C<logout> C<admin> or C<cls>
are already handled and never passed through this function.

If the client sent a message that is somehow not valid, do B<not>
respond with a fatal error.  This will probably cause the client session
to be terminated.  Instead, use the display functions to write back to
the client that their message is invalid.

=cut

sub messageData {
  # @@TODO:
}

=item B<hasCancel()>

Check whether the client has requested the operation be cancelled.

This is only available between C<cgi()> and C<complete()> and when the
C<procType> is C<credential> or C<resume>.  Otherwise, a fatal error
occurs.

See the documentation at the top of this module for the meaning of
cancellation.

The return value is 1 if a cancel has been requested, 0 if not.

=cut

sub hasCancel {
  # @@TODO:
}

=item B<nameCred()>

Get the username that the client submitted.

This is only available between C<cgi()> and C<complete()> and when the
C<procType> is C<credential> and when C<hasCancel> is 0.  Otherwise, a
fatal error occurs.

The return value is a Unicode string.

=cut

sub nameCred {
  # @@TODO:
}

=item B<passCred()>

Get the password that the client submitted.

This is only available between C<cgi()> and C<complete()> and when the
C<procType> is C<credential> and when C<hasCancel> is 0.  Otherwise, a
fatal error occurs.

The return value is a Unicode string.

=cut

sub passCred {
  # @@TODO:
}

=item B<complete()>

Finish the CGI transaction and send the appropriate response back to the
client.

This is only available after C<cgi()> has been called.  Once you call
this function, you may no longer make any further calls to the object
instance.

This function sends data back over standard input, so nothing except
this object instance should touch standard input.

=cut

sub complete {
  # @@TODO:
}

=back

=head1 AUTHOR

Noah Johnson, C<noah.johnson@loupmail.com>

=head1 COPYRIGHT AND LICENSE

Copyright (C) 2022 Multimedia Data Technology Inc.

MIT License:

Permission is hereby granted, free of charge, to any person obtaining a
copy of this software and associated documentation files
(the "Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be included
in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

=cut

# End with something that evaluates to true
#
1;
