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
    }
}

module.exports = SessionService;
