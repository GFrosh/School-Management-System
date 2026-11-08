const db = require("../db/db");

class SessionRepository {
    async getAllSessions(current) {
        return current ? await db("academic_sessions").where({ is_current: true }).first() : await db("academic_sessions").orderBy("start_date", "desc");
    }

    async getSessionById(id) {
        return await db("academic_sessions").where({ id }).first();
    }

    async getTermsBySessId(id) {
        return await db("terms").where({ session_id: id });
    }

    async createNew(data) {
        return db.transaction(async (trx) => {
            if (data.is_current) {
                await trx('academic_sessions').update({ is_current: false });
            }
            const [newSession] = await trx('academic_sessions').insert(data).returning('*');
            return newSession;
        }
    )}

    async updateSession(id, data) {
        return db.transaction(async (trx) => {
            if (data.is_current) {
                await trx('academic_sessions').update({ is_current: false });
            }
            const [updatedCurrent] = await trx("academic_sessions").where({ id }).update(data).returning("*");
            return updatedCurrent;
        });
    }


    async createNewTerm(data) {
        return await db("terms").insert(data);
    }
}

module.exports = SessionRepository;
