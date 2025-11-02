"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rtdbPresenceMirror = void 0;
const database_1 = require("firebase-functions/v2/database");
const firestore_1 = require("firebase-admin/firestore");
require("../lib/admin");
exports.rtdbPresenceMirror = (0, database_1.onValueWritten)({ ref: "status/{uid}", region: "europe-west1" }, async (event) => {
    const after = event.data.after.val(); // { state, lastChanged }
    const uid = event.params.uid;
    if (!after)
        return;
    await (0, firestore_1.getFirestore)().collection("users").doc(uid).set({
        presence: after.state,
        presenceAt: Date.now()
    }, { merge: true });
});
//# sourceMappingURL=rtdbPresenceMirror.js.map