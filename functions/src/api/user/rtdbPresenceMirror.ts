import { onValueWritten } from "firebase-functions/v2/database";
import { getFirestore } from "firebase-admin/firestore";
import "../../admin";

export const rtdbPresenceMirror = onValueWritten(
  { ref: "status/{uid}", region: "europe-west1" },
  async (event) => {
    const after = event.data.after.val(); // { state, lastChanged }
    const uid = event.params.uid as string;
    if (!after) return;
    await getFirestore().collection("users").doc(uid).set({
      presence: after.state,
      presenceAt: Date.now()
    }, { merge: true });
  }
);
