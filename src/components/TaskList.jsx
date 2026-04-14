import React from 'react';
import TaskItem from './TaskItem';
import { useLanguage } from '../contexts/LanguageContext';

export default function TaskList({ tasks, onToggle, onDelete }) {
    const { t } = useLanguage();

    if (tasks.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-400 dark:text-gray-500 text-lg">{t('noTasks')}</p>
            </div>
        );
    }

    return (
        <div className="space-y-1">
            {tasks.map((task) => (
                <TaskItem
                    key={task.id}
                    task={task}
                    onToggle={onToggle}
                    onDelete={onDelete}
                />
            ))}
        </div>
    );
}
