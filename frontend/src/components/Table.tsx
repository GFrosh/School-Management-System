import type { ReactNode } from 'react';
import styles from './Table.module.css';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T, index: number) => ReactNode;
  align?: 'start' | 'end';
  width?: string;
  /** set for the column that identifies the row, so headers are scoped row headers */
  isRowHeader?: boolean;
}

interface TableProps<T> {
  caption: string;
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyMessage: string;
  stickyHeader?: boolean;
}

/** Real <table> semantics with <th scope>, per the accessibility brief. */
export function Table<T>({ caption, columns, rows, rowKey, emptyMessage, stickyHeader = true }: TableProps<T>) {
  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <caption className={styles.caption}>{caption}</caption>
        <thead className={stickyHeader ? styles.sticky : undefined}>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={column.align === 'end' ? styles.alignEnd : undefined}
                style={column.width ? { width: column.width } : undefined}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className={styles.empty}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={rowKey(row)}>
                {columns.map((column) =>
                  column.isRowHeader ? (
                    <th key={column.key} scope="row" className={styles.rowHeader}>
                      {column.render(row, index)}
                    </th>
                  ) : (
                    <td key={column.key} className={column.align === 'end' ? styles.alignEnd : undefined}>
                      {column.render(row, index)}
                    </td>
                  ),
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
