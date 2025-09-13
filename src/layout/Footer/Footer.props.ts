export interface FooterProps {
  /**
   * Название компании
   */
  companyName?: string;

  /**
   * Описание компании
   */
  companyDescription?: string;

  /**
   * Секции футера
   */
  sections?: FooterSection[];

  /**
   * Контактная информация
   */
  contactInfo?: ContactInfo;

  /**
   * Текст копирайта
   */
  copyrightText?: string;

  /**
   * Дополнительные CSS классы
   */
  className?: string;
}

export interface FooterSection {
  /**
   * Заголовок секции
   */
  title: string;

  /**
   * Ссылки в секции
   */
  links: FooterLink[];
}

export interface FooterLink {
  /**
   * Текст ссылки
   */
  label: string;

  /**
   * URL ссылки
   */
  href: string;

  /**
   * Дополнительные CSS классы
   */
  className?: string;
}

export interface ContactInfo {
  /**
   * Email адрес
   */
  email?: string;

  /**
   * Номер телефона
   */
  phone?: string;

  /**
   * Адрес
   */
  address?: string;
}

