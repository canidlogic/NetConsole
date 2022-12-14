#!/usr/bin/env perl
use strict;
use warnings;

# Database imports
#
# Get DBD::SQLite to install all you need
#
use DBI qw(:sql_types);
use DBD::SQLite::Constants ':dbd_sqlite_string_mode';

=head1 NAME

netc_createdb.pl - Create a new remote NetConsole database with the
appropriate structure.

=head1 SYNOPSIS

  ./netc_createdb.pl path/to/db.sqlite

=head1 DESCRIPTION

This script is used to create a new, empty database for use in remote
NetConsole servers, with the appropriate structure but no records.

The database must not already exist or a fatal error occurs.

The SQL string embedded in this script contains the complete database
structure.  The following subsections describe the function of each
table within the database.

=head2 usr table

The C<usr> table stores information about the registered users.  Each
user must have a unique C<usrname> that identifies them.  The C<usrpswd>
stores a hash of the user's password, in the format generated by the
C<Crypt::Bcrypt> library.  The C<usradmin> is 1 if the user is an
administrator, or 0 if the user is a regular user.

=head2 ssn table

The C<ssn> table stores information about active sessions.

Each session is randomly assigned a unique C<ssncode> to uniquely
identify it.  A cryptographically secure random number generator must be
used.  The code must be in range [0, 16777215].  This allows the code to
be stored in exactly four base-64 digits.

Each session also has a timestamp C<ssntime> which counts the number of
I<minutes> that have elapsed since midnight GMT at the start of January
1, 1970.  This timestamp is updated to the current time each time a
transaction is performed in the session.  Sessions whose timestamps are
older than a certain number of minutes can be automatically closed.
(The specific number of minutes before sessions are closed is not
defined within the database.)

The C<ssnkey> stores sixteen randomly generated base-64 digits that were
generated with a cryptographically secure random number generator.  This
is used as a secret key to sign HMAC-MD5 digests that are used to
authenticate that the client has tampered with context.  Each time a
context is validated with a key, the key is immediately changed to a
different random value.

Finally, each session stores a foreign key into the C<usr> table to
determine which user the session belongs to.

=head2 var table

The C<var> table stores configuration variables.  The specific
configuration variables are not defined by NetConsole.  This is instead
intended for use by specific remote NetConsole server implementations to
store their own configurations.

This table is a simple string key/value map where the unique keys are
the C<varname> column and the string values are the C<varvalue> column.

=cut

# Define a string holding the whole SQL script for creating the
# structure of the database, with semicolons used as the termination
# character for each statement and nowhere else
#
my $sql_script = q{

CREATE TABLE usr (
  usrid     INTEGER PRIMARY KEY ASC,
  usrname   TEXT UNIQUE NOT NULL,
  usrpswd   TEXT NOT NULL,
  usradmin  INTEGER NOT NULL
);

CREATE UNIQUE INDEX ix_usr_name
  ON usr(usrname);

CREATE TABLE ssn (
  ssnid     INTEGER PRIMARY KEY ASC,
  ssncode   INTEGER UNIQUE NOT NULL,
  ssntime   INTEGER NOT NULL,
  ssnkey    TEXT NOT NULL,
  usrid     INTEGER NOT NULL
              REFERENCES usr(usrid)
);

CREATE UNIQUE INDEX ix_ssn_code
  ON ssn(ssncode);

CREATE INDEX ix_ssn_time
  ON ssn(ssntime);

CREATE INDEX ix_ssn_usr
  ON ssn(usrid);

CREATE TABLE var (
  varid     INTEGER PRIMARY KEY ASC,
  varname   TEXT UNIQUE NOT NULL,
  varvalue  TEXT NOT NULL
);

CREATE UNIQUE INDEX ix_var_name
  ON var(varname);

};

# ==================
# Program entrypoint
# ==================

# Get parameter
#
($#ARGV == 0) or die "Wrong number of program arguments, stopped";
my $db_path = $ARGV[0];

# Check that database path does not currently exist
#
(not (-e $db_path)) or die "Path '$db_path' already exists, stopped";

# Connect to the SQLite database; the database will be created if it 
# does not exist; also, turn autocommit mode off so we can use 
# transactions, turn RaiseError on so database problems cause fatal 
# errors, and turn off PrintError since it is redundant with RaiseError
#
my $dbh = DBI->connect("dbi:SQLite:dbname=$db_path", "", "", {
                        AutoCommit => 0,
                        RaiseError => 1,
                        PrintError => 0
                      }) or die "Can't create database, stopped";

# Turn on binary strings mode
#
$dbh->{sqlite_string_mode} = DBD_SQLITE_STRING_MODE_BYTES;

# Everything will be performed in a single transaction
#
$dbh->do('BEGIN IMMEDIATE TRANSACTION');

# Wrap rest in an eval block so that the transaction is rolled back if
# there is an error
#
eval {
  
  # Parse our SQL script into a sequence of statements, each ending with
  # a semicolon
  my @sql_list;
  @sql_list = $sql_script =~ m/(.*?);/gs
    or die "Failed to parse SQL script, stopped";
  
  # Run all the SQL statements needed to build the the database 
  # structure
  for my $sql (@sql_list) {
    $dbh->do($sql);
  }
  
  # If we got all the way here, commit the transaction
  $dbh->commit;
  
};
if ($@) {
  # We encountered some kind of error, so rollback transaction
  $dbh->rollback;
  
  # Raise the error again
  die "Operation failed: $@";
}

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
