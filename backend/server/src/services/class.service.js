const ClassRepository = require("../repositories/class.repository");
const repo = new ClassRepository();

const ClassService = {
    get: async () => {
        return await repo.getClasses();
    },
    new: async (data) => {
        // return await 
    }
}

module.exports = ClassService;
