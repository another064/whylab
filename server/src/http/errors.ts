/** 业务可预期的错误：抛出后由 errorHandler 转成统一的失败信封。 */
export class HttpError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.code = code
  }
}

export function validationError(message: string): HttpError {
  return new HttpError(400, 'VALIDATION_ERROR', message)
}

export function notFound(message: string): HttpError {
  return new HttpError(404, 'NOT_FOUND', message)
}
