import { format, formatDistance, parseISO, differenceInDays, isValid } from 'date-fns';
import { pl } from 'date-fns/locale';

/**
 * Format date in Polish format (DD.MM.YYYY)
 */
export function formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(d)) return '-';
    return format(d, 'dd.MM.yyyy', { locale: pl });
}

/**
 * Format date with day name (Poniedziałek, 15.01.2026)
 */
export function formatDateLong(date: Date | string): string {
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(d)) return '-';
    return format(d, 'EEEE, dd.MM.yyyy', { locale: pl });
}

/**
 * Format relative time (np. "3 dni temu", "za 2 tygodnie")
 */
export function formatRelative(date: Date | string): string {
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(d)) return '-';
    return formatDistance(d, new Date(), { addSuffix: true, locale: pl });
}

/**
 * Get days difference from today
 * Positive = overdue, Negative = upcoming
 */
export function getDaysDifference(date: Date | string): number {
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(d)) return 0;
    return differenceInDays(new Date(), d);
}

/**
 * Format days offset for sequence steps
 * -7 -> "7 dni przed terminem"
 * +3 -> "3 dni po terminie"
 */
export function formatDaysOffset(days: number): string {
    if (days === 0) return 'W dniu terminu';
    if (days === -1) return '1 dzień przed terminem';
    if (days === 1) return '1 dzień po terminie';
    if (days < 0) return `${Math.abs(days)} dni przed terminem`;
    return `${days} dni po terminie`;
}

/**
 * Format overdue days label
 */
export function formatOverdueDays(days: number): string {
    if (days === 0) return 'Dziś termin';
    if (days === 1) return '1 dzień po terminie';
    if (days < 0) {
        const remaining = Math.abs(days);
        if (remaining === 1) return 'Termin za 1 dzień';
        return `Termin za ${remaining} dni`;
    }
    return `${days} dni po terminie`;
}
