package org.owasp.csrfguard.log;

public class Slf4jLogger implements ILogger {

	private static final long serialVersionUID = 1L;

	private static org.slf4j.Logger LOGGER = org.slf4j.LoggerFactory.getLogger("Owasp.CsrfGuard");

	@Override
	public void log(String msg) {
		LOGGER.info(msg);
	}

	@Override
	public void log(LogLevel level, String msg) {
		switch(level) {
			case Trace:
				LOGGER.trace(msg);
				break;
			case Debug:
				LOGGER.debug(msg);
				break;
			case Info:
				LOGGER.info(msg);
				break;
			case Warning:
				LOGGER.warn(msg);
				break;
			case Error:
				LOGGER.warn(msg);
				break;
			case Fatal:
				LOGGER.error(msg);
				break;
			default:
				throw new RuntimeException("unsupported log level " + level);
		}
	}

	@Override
	public void log(Exception exception) {
		LOGGER.warn(exception.getLocalizedMessage(), exception);
	}

	@Override
	public void log(LogLevel level, Exception exception) {
			switch(level) {
			case Trace:
				LOGGER.trace(exception.getLocalizedMessage(), exception);
				break;
			case Debug:
				LOGGER.debug(exception.getLocalizedMessage(), exception);
				break;
			case Info:
				LOGGER.info(exception.getLocalizedMessage(), exception);
				break;
			case Warning:
				LOGGER.warn(exception.getLocalizedMessage(), exception);
				break;
			case Error:
				LOGGER.warn(exception.getLocalizedMessage(), exception);
				break;
			case Fatal:
				LOGGER.error(exception.getLocalizedMessage(), exception);
				break;
			default:
				throw new RuntimeException("unsupported log level " + level);
		}
	}

}
