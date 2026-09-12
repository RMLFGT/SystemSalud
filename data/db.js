/* Base de datos local para la demostración universitaria. No usar con datos reales. */
const SaludDB = (() => {
    const stores = ["pacientes", "medicos", "citas", "expedientes", "estudios", "medicamentos"];
    const ready = new Set();
    let connection;

    function open() {
        if (!connection) {
            connection = new Promise((resolve, reject) => {
                const request = indexedDB.open("SaludSystemDemo", 1);
                request.onupgradeneeded = () => {
                    const db = request.result;
                    for (const name of stores) {
                        if (!db.objectStoreNames.contains(name)) {
                            db.createObjectStore(name, { keyPath: "id" });
                        }
                    }
                    if (!db.objectStoreNames.contains("metadata")) {
                        db.createObjectStore("metadata", { keyPath: "name" });
                    }
                };
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        }
        return connection;
    }

    async function load(name, seed) {
        if (!stores.includes(name)) throw new Error("Colección desconocida");
        const db = await open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction([name, "metadata"], "readwrite");
            const store = tx.objectStore(name);
            const marker = tx.objectStore("metadata").get(name);
            let rows = [];
            marker.onsuccess = () => {
                if (!marker.result) {
                    for (const item of seed) store.put(item);
                    tx.objectStore("metadata").put({ name, seeded: true });
                    rows = structuredClone(seed);
                } else {
                    const request = store.getAll();
                    request.onsuccess = () => { rows = request.result; };
                }
            };
            tx.oncomplete = () => { ready.add(name); resolve(rows); };
            tx.onerror = () => reject(tx.error);
        });
    }

    async function save(name, rows) {
        if (!ready.has(name)) return;
        const db = await open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(name, "readwrite");
            const store = tx.objectStore(name);
            store.clear();
            for (const row of rows) store.put(row);
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });
    }

    function persist(name, rows) {
        save(name, rows).catch(error => {
            console.error("No se pudieron guardar los datos de demostración", error);
            alert("No se pudieron guardar los cambios en este navegador.");
        });
    }

    return { load, persist };
})();
