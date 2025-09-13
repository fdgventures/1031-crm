export interface HeaderProps {
  /**
   * Заголовок сайта
   */
  title?: string;

  /**
   * Ссылки навигации
   */
  navigationItems?: NavigationItem[];

  /**
   * Показывать ли кнопку входа
   */
  showLoginButton?: boolean;

  /**
   * Текст кнопки входа
   */
  loginButtonText?: string;

  /**
   * Обработчик клика по кнопке входа
   */
  onLoginClick?: () => void;

  /**
   * Дополнительные CSS классы
   */
  className?: string;
}

export interface NavigationItem {
  /**
   * Текст ссылки
   */
  label: string;

  /**
   * URL ссылки
   */
  href: string;

  /**
   * Активна ли ссылка
   */
  isActive?: boolean;

  /**
   * Дополнительные CSS классы
   */
  className?: string;
}

