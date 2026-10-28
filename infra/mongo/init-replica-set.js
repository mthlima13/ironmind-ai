// ==============================================================================
// IronMind AI - replica set bootstrap
//
// MongoDB only accepts multi document transactions in a replica set, and the
// recalculation of the personal records relies on them. This script runs once,
// after the server is healthy, and is idempotent: an already initiated set is
// only waited for, never initiated again.
// ==============================================================================

const HOST = "mongo:27017";
const SET_NAME = "rs0";

try {
  rs.status();
  print("Replica set already initiated.");
} catch (error) {
  print("Initiating replica set " + SET_NAME + "...");
  rs.initiate({ _id: SET_NAME, members: [{ _id: 0, host: HOST }] });
}

// The API connects with replicaSet=rs0: wait until the node accepts writes so
// the container that depends on this one does not race the election.
for (let attempt = 0; attempt < 120; attempt++) {
  let hello = null;
  try {
    hello = db.hello();
  } catch (error) {
    hello = null;
  }
  if (hello && hello.isWritablePrimary) {
    print("Replica set is primary and ready.");
    quit(0);
  }
  sleep(500);
}

print("Replica set did not become primary in time.");
quit(1);
