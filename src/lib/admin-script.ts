
// export const scriptForClipboard = `const admin = require('firebase-admin');

// // --- ¡IMPORTANTE! ---
// // 1. Reemplaza 'AQUÍ_TU_PROJECT_ID' con tu Project ID real que aparece en la página.
// // 2. Reemplaza 'AQUÍ_TU_UID' con tu UID real que aparece en la página.
// const projectId = 'AQUÍ_TU_PROJECT_ID';
// const uid = 'AQUÍ_TU_UID';
// // --------------------

// // --- Verificaciones ---
// if (projectId.includes('AQUÍ_TU_PROJECT_ID')) {
//   console.error('❌ ERROR: ¡No has reemplazado el placeholder del Project ID! Copia tu Project ID de la página y pégalo en la variable \\`projectId\\`.');
//   process.exit(1);
// }

// if (uid.includes('AQUÍ_TU_UID')) {
//   console.error('❌ ERROR: ¡No has reemplazado el placeholder del UID! Copia tu UID de la página y pégalo en la variable \\`uid\\`.');
//   process.exit(1);
// }
// // --------------------

// // En Cloud Shell, la autenticación es automática. ¡No se necesita un archivo de clave!
// admin.initializeApp({
//   credential: admin.credential.applicationDefault(),
//   projectId: projectId,
// });

// admin
//   .auth()
//   .setCustomUserClaims(uid, { role: 'admin' })
//   .then(() => {
//     console.log(\`✅ ¡Éxito! Se asignó el rol "admin" al usuario con UID: \${uid}\`);
//     console.log('🎉 Cierra sesión y vuelve a iniciarla en la app para ver los cambios.');
//     process.exit(0);
//   })
//   .catch((error) => {
//     console.error('❌ Error al asignar el rol:', error);
//     if (error.code === 'auth/user-not-found') {
//         console.error('🤔 Pista: El UID que proporcionaste no existe. ¿Lo copiaste correctamente?');
//     }
//     process.exit(1);
//   });
// `;
