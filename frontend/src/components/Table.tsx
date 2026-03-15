import { cn } from "@/lib/utils";

interface Column<T> {
    header: string;
    accessor: keyof T | ((item: T) => React.ReactNode);
    className?: string;
}

interface TableProps<T> {
    data: T[];
    columns: Column<T>[];
    onRowClick?: (item: T) => void;
}

export function Table<T>({ data, columns, onRowClick }: TableProps<T>) {
    return (
        <div className="overflow-x-auto bg-white border border-[var(--cool-silver-dark)] rounded-2xl shadow-sm">
            <table className="min-w-full divide-y divide-[var(--cool-silver-dark)]">
                <thead className="bg-[var(--cool-silver)]/50">
                    <tr>
                        {columns.map((column, idx) => (
                            <th
                                key={idx}
                                scope="col"
                                className={cn(
                                    "px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider",
                                    column.className
                                )}
                            >
                                {column.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-[var(--cool-silver-dark)]">
                    {data.map((item, rowIdx) => (
                        <tr
                            key={rowIdx}
                            onClick={() => onRowClick?.(item)}
                            className={cn(
                                "hover:bg-[var(--cool-silver)]/20 transition-colors",
                                onRowClick && "cursor-pointer"
                            )}
                        >
                            {columns.map((column, colIdx) => (
                                <td
                                    key={colIdx}
                                    className={cn("px-6 py-4 whitespace-nowrap text-sm text-gray-900", column.className)}
                                >
                                    {typeof column.accessor === "function"
                                        ? column.accessor(item)
                                        : (item[column.accessor] as React.ReactNode)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
