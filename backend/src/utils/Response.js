class ApiResponse {
  /**
   * 
   * @param {*} res 
   * @param {*} data 
   * @param {*} meta 
   * @param {number} status 
   * @returns 
   */
  static success(res, data, meta = null, status = 200) {
    const body = { success: true, data };
    if (meta) body.meta = meta;
    return res.status(status).json(body);
  }

  /**
   * 
   * @param {*} res
   * @param {number} status
   * @param {string} code
   * @param {string} message
   * @param {Array} details
   * @returns 
   */
  static error(status, code, message, details = []) {
    const errorInstance = new Error(message);
    errorInstance.status = status;
    errorInstance.code = code;
    errorInstance.details = details;
    errorInstance.isOperational = true; // Flags it as a trusted application error
    return errorInstance;
  }
}

module.exports = ApiResponse;
