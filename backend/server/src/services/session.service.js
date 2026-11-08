const SessionRepository = require("../repositories/session.repository");
const sessionRepo = new SessionRepository();

const SessionService = {
    getAll: async (isCurrent) => {
        return await sessionRepo.getAllSessions(isCurrent);
    },
    getById: async () => {
        return await sessionRepo.getSessionById();
    },
    getTerms: async (id) => {
        return await sessionRepo.getTermsBySessId(id);
    },
    newSess: async (data) => {
        return await sessionRepo.createNew({
            name: data.name,
            start_date: data.startDate,
            end_date: data.endDate,
            is_current: data.isCurrent
        });
    },
    updateSess: async (id, data) => {
        return await sessionRepo.updateSession(id, {
            is_current: data.isCurrent
        });
    },
    createTerm: async (id, data) => {
        return await sessionRepo.createNewTerm({
            session_id: id,
            sequence: data.sequence,
            name: data.name,
            start_date: data.startDate,
            end_date: data.endDate
        });
    }
}

module.exports = SessionService;
