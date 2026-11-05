BEGIN TRY

BEGIN TRAN;

-- CreateSchema
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = N'dbo') EXEC sp_executesql N'CREATE SCHEMA [dbo];';

-- CreateTable
CREATE TABLE [dbo].[users] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [mobile_number] NVARCHAR(1000),
    [email] NVARCHAR(255) NOT NULL,
    [username] NVARCHAR(255),
    [first_name] NVARCHAR(1000) NOT NULL,
    [last_name] NVARCHAR(1000) NOT NULL,
    [avatar] NVARCHAR(1000),
    [bio] NVARCHAR(1000),
    [timezone] NVARCHAR(1000) NOT NULL CONSTRAINT [users_timezone_df] DEFAULT 'UTC',
    [language] NVARCHAR(1000) NOT NULL CONSTRAINT [users_language_df] DEFAULT 'en',
    [role] NVARCHAR(64) NOT NULL CONSTRAINT [users_role_df] DEFAULT 'MEMBER',
    [status] NVARCHAR(64) NOT NULL CONSTRAINT [users_status_df] DEFAULT 'ACTIVE',
    [last_login_at] DATETIME2,
    [email_verified] BIT NOT NULL CONSTRAINT [users_email_verified_df] DEFAULT 0,
    [password] NVARCHAR(1000),
    [refresh_token] NVARCHAR(1000),
    [preferences] NVARCHAR(max),
    [onboardInfo] NVARCHAR(max),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [users_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    [deleted_at] DATETIME2,
    [deleted_by] UNIQUEIDENTIFIER,
    [reset_token] NVARCHAR(255),
    [reset_token_expiry] DATETIME2,
    [default_organization_id] UNIQUEIDENTIFIER,
    [source] NVARCHAR(64) NOT NULL CONSTRAINT [users_source_df] DEFAULT 'MANUAL',
    [external_id] NVARCHAR(255),
    [external_provider] NVARCHAR(1000),
    CONSTRAINT [users_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [users_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[organizations] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [slug] NVARCHAR(255) NOT NULL,
    [description] NVARCHAR(1000),
    [avatar] NVARCHAR(1000),
    [website] NVARCHAR(1000),
    [settings] NVARCHAR(max),
    [owner_id] UNIQUEIDENTIFIER NOT NULL,
    [created_by_id] UNIQUEIDENTIFIER,
    [updated_by_id] UNIQUEIDENTIFIER,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [organizations_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    [archive] BIT NOT NULL CONSTRAINT [organizations_archive_df] DEFAULT 0,
    CONSTRAINT [organizations_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [organizations_slug_key] UNIQUE NONCLUSTERED ([slug])
);

-- CreateTable
CREATE TABLE [dbo].[organization_members] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [role] NVARCHAR(64) NOT NULL CONSTRAINT [organization_members_role_df] DEFAULT 'MEMBER',
    [joined_at] DATETIME2 NOT NULL CONSTRAINT [organization_members_joined_at_df] DEFAULT CURRENT_TIMESTAMP,
    [user_id] UNIQUEIDENTIFIER NOT NULL,
    [organization_id] UNIQUEIDENTIFIER NOT NULL,
    [created_by_id] UNIQUEIDENTIFIER,
    [updated_by_id] UNIQUEIDENTIFIER,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [organization_members_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    [is_default] BIT NOT NULL CONSTRAINT [organization_members_is_default_df] DEFAULT 0,
    CONSTRAINT [organization_members_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [organization_members_user_id_organization_id_key] UNIQUE NONCLUSTERED ([user_id],[organization_id])
);

-- CreateTable
CREATE TABLE [dbo].[workspaces] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [slug] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000),
    [avatar] NVARCHAR(1000),
    [color] NVARCHAR(1000),
    [settings] NVARCHAR(max),
    [organization_id] UNIQUEIDENTIFIER NOT NULL,
    [parent_workspace_id] UNIQUEIDENTIFIER,
    [path] NVARCHAR(1000),
    [created_by_id] UNIQUEIDENTIFIER,
    [updated_by_id] UNIQUEIDENTIFIER,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [workspaces_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    [archive] BIT NOT NULL CONSTRAINT [workspaces_archive_df] DEFAULT 0,
    CONSTRAINT [workspaces_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [workspaces_organization_id_slug_key] UNIQUE NONCLUSTERED ([organization_id],[slug])
);

-- CreateTable
CREATE TABLE [dbo].[workspace_members] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [role] NVARCHAR(64) NOT NULL CONSTRAINT [workspace_members_role_df] DEFAULT 'MEMBER',
    [joined_at] DATETIME2 NOT NULL CONSTRAINT [workspace_members_joined_at_df] DEFAULT CURRENT_TIMESTAMP,
    [user_id] UNIQUEIDENTIFIER NOT NULL,
    [workspace_id] UNIQUEIDENTIFIER NOT NULL,
    [created_by_id] UNIQUEIDENTIFIER,
    [updated_by_id] UNIQUEIDENTIFIER,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [workspace_members_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [workspace_members_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [workspace_members_user_id_workspace_id_key] UNIQUE NONCLUSTERED ([user_id],[workspace_id])
);

-- CreateTable
CREATE TABLE [dbo].[projects] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [slug] NVARCHAR(255) NOT NULL,
    [task_prefix] VARCHAR(8),
    [description] NVARCHAR(1000),
    [avatar] NVARCHAR(1000),
    [color] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(64) NOT NULL CONSTRAINT [projects_status_df] DEFAULT 'PLANNING',
    [priority] NVARCHAR(64) NOT NULL CONSTRAINT [projects_priority_df] DEFAULT 'MEDIUM',
    [visibility] NVARCHAR(64) NOT NULL CONSTRAINT [projects_visibility_df] DEFAULT 'PRIVATE',
    [start_date] DATETIME2,
    [end_date] DATETIME2,
    [settings] NVARCHAR(max),
    [workflow_id] UNIQUEIDENTIFIER NOT NULL,
    [workspace_id] UNIQUEIDENTIFIER NOT NULL,
    [created_by_id] UNIQUEIDENTIFIER,
    [updated_by_id] UNIQUEIDENTIFIER,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [projects_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    [archive] BIT NOT NULL CONSTRAINT [projects_archive_df] DEFAULT 0,
    CONSTRAINT [projects_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [projects_slug_key] UNIQUE NONCLUSTERED ([slug]),
    CONSTRAINT [projects_workspace_id_slug_key] UNIQUE NONCLUSTERED ([workspace_id],[slug])
);

-- CreateTable
CREATE TABLE [dbo].[project_members] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [role] NVARCHAR(64) NOT NULL CONSTRAINT [project_members_role_df] DEFAULT 'MEMBER',
    [joined_at] DATETIME2 NOT NULL CONSTRAINT [project_members_joined_at_df] DEFAULT CURRENT_TIMESTAMP,
    [user_id] UNIQUEIDENTIFIER NOT NULL,
    [project_id] UNIQUEIDENTIFIER NOT NULL,
    [created_by_id] UNIQUEIDENTIFIER,
    [updated_by_id] UNIQUEIDENTIFIER,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [project_members_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [project_members_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [project_members_user_id_project_id_key] UNIQUE NONCLUSTERED ([user_id],[project_id])
);

-- CreateTable
CREATE TABLE [dbo].[tasks] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000),
    [type] NVARCHAR(64) NOT NULL CONSTRAINT [tasks_type_df] DEFAULT 'TASK',
    [priority] NVARCHAR(64) NOT NULL CONSTRAINT [tasks_priority_df] DEFAULT 'MEDIUM',
    [task_number] INT NOT NULL,
    [slug] NVARCHAR(1000) NOT NULL,
    [start_date] DATETIME2,
    [due_date] DATETIME2,
    [completed_at] DATETIME2,
    [story_points] INT,
    [original_estimate] INT,
    [remaining_estimate] INT,
    [custom_fields] NVARCHAR(max),
    [project_id] UNIQUEIDENTIFIER NOT NULL,
    [status_id] UNIQUEIDENTIFIER NOT NULL,
    [sprint_id] UNIQUEIDENTIFIER,
    [parent_task_id] UNIQUEIDENTIFIER,
    [created_by_id] UNIQUEIDENTIFIER,
    [updated_by_id] UNIQUEIDENTIFIER,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [tasks_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    [is_archived] BIT NOT NULL CONSTRAINT [tasks_is_archived_df] DEFAULT 0,
    [archived_by] UNIQUEIDENTIFIER,
    [inbox_message_id] UNIQUEIDENTIFIER,
    [email_thread_id] NVARCHAR(255),
    [allow_email_replies] BIT NOT NULL CONSTRAINT [tasks_allow_email_replies_df] DEFAULT 0,
    [trello_card_id] NVARCHAR(255),
    [jira_issue_id] NVARCHAR(255),
    [is_recurring] BIT NOT NULL CONSTRAINT [tasks_is_recurring_df] DEFAULT 0,
    [recurring_task_id] UNIQUEIDENTIFIER,
    CONSTRAINT [tasks_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [tasks_project_id_task_number_key] UNIQUE NONCLUSTERED ([project_id],[task_number])
);

-- CreateTable
CREATE TABLE [dbo].[recurring_tasks] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [task_id] UNIQUEIDENTIFIER NOT NULL,
    [recurrence_type] NVARCHAR(64) NOT NULL,
    [interval] INT NOT NULL CONSTRAINT [recurring_tasks_interval_df] DEFAULT 1,
    [days_of_week] NVARCHAR(max) NOT NULL CONSTRAINT [recurring_tasks_days_of_week_df] DEFAULT '[]',
    [day_of_month] INT,
    [month_of_year] INT,
    [end_type] NVARCHAR(64) NOT NULL,
    [end_date] DATETIME2,
    [occurrence_count] INT,
    [current_occurrence] INT NOT NULL CONSTRAINT [recurring_tasks_current_occurrence_df] DEFAULT 1,
    [is_active] BIT NOT NULL CONSTRAINT [recurring_tasks_is_active_df] DEFAULT 1,
    [next_occurrence] DATETIME2 NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [recurring_tasks_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [recurring_tasks_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [recurring_tasks_task_id_key] UNIQUE NONCLUSTERED ([task_id])
);

-- CreateTable
CREATE TABLE [dbo].[task_ranks] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [task_id] UNIQUEIDENTIFIER NOT NULL,
    [scope_type] NVARCHAR(64) NOT NULL,
    [scope_id] UNIQUEIDENTIFIER NOT NULL,
    [view_type] NVARCHAR(64) NOT NULL,
    [rank] FLOAT(53),
    CONSTRAINT [task_ranks_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [task_ranks_task_id_scope_type_scope_id_view_type_key] UNIQUE NONCLUSTERED ([task_id],[scope_type],[scope_id],[view_type])
);

-- CreateTable
CREATE TABLE [dbo].[task_dependencies] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [type] NVARCHAR(64) NOT NULL CONSTRAINT [task_dependencies_type_df] DEFAULT 'BLOCKS',
    [dependent_task_id] UNIQUEIDENTIFIER NOT NULL,
    [blocking_task_id] UNIQUEIDENTIFIER NOT NULL,
    [created_by_id] UNIQUEIDENTIFIER,
    [updated_by_id] UNIQUEIDENTIFIER,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [task_dependencies_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [task_dependencies_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [task_dependencies_dependent_task_id_blocking_task_id_key] UNIQUE NONCLUSTERED ([dependent_task_id],[blocking_task_id])
);

-- CreateTable
CREATE TABLE [dbo].[workflows] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000),
    [is_default] BIT NOT NULL CONSTRAINT [workflows_is_default_df] DEFAULT 0,
    [organization_id] UNIQUEIDENTIFIER NOT NULL,
    [created_by_id] UNIQUEIDENTIFIER,
    [updated_by_id] UNIQUEIDENTIFIER,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [workflows_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [workflows_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[task_statuses] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [color] NVARCHAR(1000) NOT NULL,
    [category] NVARCHAR(64) NOT NULL,
    [position] INT NOT NULL,
    [is_default] BIT NOT NULL CONSTRAINT [task_statuses_is_default_df] DEFAULT 0,
    [workflow_id] UNIQUEIDENTIFIER NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [task_statuses_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    [created_by_id] UNIQUEIDENTIFIER,
    [updated_by_id] UNIQUEIDENTIFIER,
    [deleted_at] DATETIME2,
    [deleted_by] UNIQUEIDENTIFIER,
    CONSTRAINT [task_statuses_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [task_statuses_workflow_id_name_key] UNIQUE NONCLUSTERED ([workflow_id],[name])
);

-- CreateTable
CREATE TABLE [dbo].[status_transitions] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [name] NVARCHAR(1000),
    [description] NVARCHAR(1000),
    [workflow_id] UNIQUEIDENTIFIER NOT NULL,
    [from_status_id] UNIQUEIDENTIFIER NOT NULL,
    [to_status_id] UNIQUEIDENTIFIER NOT NULL,
    [created_by_id] UNIQUEIDENTIFIER,
    [updated_by_id] UNIQUEIDENTIFIER,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [status_transitions_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [status_transitions_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [status_transitions_workflow_id_from_status_id_to_status_id_key] UNIQUE NONCLUSTERED ([workflow_id],[from_status_id],[to_status_id])
);

-- CreateTable
CREATE TABLE [dbo].[sprints] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [slug] NVARCHAR(1000),
    [goal] NVARCHAR(1000),
    [status] NVARCHAR(64) NOT NULL CONSTRAINT [sprints_status_df] DEFAULT 'PLANNING',
    [is_default] BIT NOT NULL CONSTRAINT [sprints_is_default_df] DEFAULT 0,
    [archive] BIT NOT NULL CONSTRAINT [sprints_archive_df] DEFAULT 0,
    [start_date] DATETIME2,
    [end_date] DATETIME2,
    [project_id] UNIQUEIDENTIFIER NOT NULL,
    [created_by_id] UNIQUEIDENTIFIER,
    [updated_by_id] UNIQUEIDENTIFIER,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [sprints_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [sprints_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[labels] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [color] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000),
    [project_id] UNIQUEIDENTIFIER NOT NULL,
    [created_by_id] UNIQUEIDENTIFIER,
    [updated_by_id] UNIQUEIDENTIFIER,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [labels_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [labels_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [labels_project_id_name_key] UNIQUE NONCLUSTERED ([project_id],[name])
);

-- CreateTable
CREATE TABLE [dbo].[workspace_labels] (
    [workspace_id] UNIQUEIDENTIFIER NOT NULL,
    [label_id] UNIQUEIDENTIFIER NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [workspace_labels_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [workspace_labels_pkey] PRIMARY KEY CLUSTERED ([workspace_id],[label_id])
);

-- CreateTable
CREATE TABLE [dbo].[task_labels] (
    [task_id] UNIQUEIDENTIFIER NOT NULL,
    [label_id] UNIQUEIDENTIFIER NOT NULL,
    [created_by_id] UNIQUEIDENTIFIER,
    [updated_by_id] UNIQUEIDENTIFIER,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [task_labels_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [task_labels_pkey] PRIMARY KEY CLUSTERED ([task_id],[label_id])
);

-- CreateTable
CREATE TABLE [dbo].[task_assignees] (
    [task_id] UNIQUEIDENTIFIER NOT NULL,
    [user_id] UNIQUEIDENTIFIER NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [task_assignees_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [task_assignees_pkey] PRIMARY KEY CLUSTERED ([task_id],[user_id])
);

-- CreateTable
CREATE TABLE [dbo].[task_reporters] (
    [task_id] UNIQUEIDENTIFIER NOT NULL,
    [user_id] UNIQUEIDENTIFIER NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [task_reporters_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [task_reporters_pkey] PRIMARY KEY CLUSTERED ([task_id],[user_id])
);

-- CreateTable
CREATE TABLE [dbo].[task_watchers] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [task_id] UNIQUEIDENTIFIER NOT NULL,
    [user_id] UNIQUEIDENTIFIER NOT NULL,
    [created_by_id] UNIQUEIDENTIFIER,
    [updated_by_id] UNIQUEIDENTIFIER,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [task_watchers_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [task_watchers_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [task_watchers_task_id_user_id_key] UNIQUE NONCLUSTERED ([task_id],[user_id])
);

-- CreateTable
CREATE TABLE [dbo].[task_comments] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [content] NVARCHAR(1000) NOT NULL,
    [task_id] UNIQUEIDENTIFIER NOT NULL,
    [author_id] UNIQUEIDENTIFIER NOT NULL,
    [parent_comment_id] UNIQUEIDENTIFIER,
    [created_by_id] UNIQUEIDENTIFIER,
    [updated_by_id] UNIQUEIDENTIFIER,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [task_comments_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    [email_message_id] NVARCHAR(255),
    [sent_as_email] BIT NOT NULL CONSTRAINT [task_comments_sent_as_email_df] DEFAULT 0,
    [email_recipients] NVARCHAR(max) NOT NULL CONSTRAINT [task_comments_email_recipients_df] DEFAULT '[]',
    [email_recipient_names] NVARCHAR(1000),
    [email_sent_at] DATETIME2,
    CONSTRAINT [task_comments_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[task_attachments] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [file_name] NVARCHAR(1000) NOT NULL,
    [file_path] NVARCHAR(1000),
    [file_size] INT NOT NULL,
    [mime_type] NVARCHAR(1000) NOT NULL,
    [url] NVARCHAR(1000),
    [storage_key] NVARCHAR(1000),
    [task_id] UNIQUEIDENTIFIER NOT NULL,
    [created_by_id] UNIQUEIDENTIFIER,
    [updated_by_id] UNIQUEIDENTIFIER,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [task_attachments_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [task_attachments_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[public_task_shares] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [token] NVARCHAR(255) NOT NULL,
    [expires_at] DATETIME2 NOT NULL,
    [revoked_at] DATETIME2,
    [task_id] UNIQUEIDENTIFIER NOT NULL,
    [created_by_id] UNIQUEIDENTIFIER,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [public_task_shares_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [public_task_shares_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [public_task_shares_token_key] UNIQUE NONCLUSTERED ([token])
);

-- CreateTable
CREATE TABLE [dbo].[time_entries] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [description] NVARCHAR(1000),
    [time_spent] INT NOT NULL,
    [start_time] DATETIME2,
    [end_time] DATETIME2,
    [date] DATETIME2 NOT NULL CONSTRAINT [time_entries_date_df] DEFAULT CURRENT_TIMESTAMP,
    [task_id] UNIQUEIDENTIFIER NOT NULL,
    [user_id] UNIQUEIDENTIFIER NOT NULL,
    [created_by_id] UNIQUEIDENTIFIER,
    [updated_by_id] UNIQUEIDENTIFIER,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [time_entries_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [time_entries_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[custom_fields] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [type] NVARCHAR(64) NOT NULL,
    [description] NVARCHAR(1000),
    [is_required] BIT NOT NULL CONSTRAINT [custom_fields_is_required_df] DEFAULT 0,
    [options] NVARCHAR(max),
    [organization_id] UNIQUEIDENTIFIER NOT NULL,
    [created_by_id] UNIQUEIDENTIFIER,
    [updated_by_id] UNIQUEIDENTIFIER,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [custom_fields_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [custom_fields_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [custom_fields_organization_id_name_key] UNIQUE NONCLUSTERED ([organization_id],[name])
);

-- CreateTable
CREATE TABLE [dbo].[notifications] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [message] NVARCHAR(1000) NOT NULL,
    [type] NVARCHAR(64) NOT NULL,
    [priority] NVARCHAR(64) NOT NULL CONSTRAINT [notifications_priority_df] DEFAULT 'MEDIUM',
    [isRead] BIT NOT NULL CONSTRAINT [notifications_isRead_df] DEFAULT 0,
    [entity_type] NVARCHAR(1000),
    [entity_id] UNIQUEIDENTIFIER,
    [action_url] NVARCHAR(1000),
    [user_id] UNIQUEIDENTIFIER NOT NULL,
    [organization_id] UNIQUEIDENTIFIER,
    [created_by_id] UNIQUEIDENTIFIER,
    [updated_by_id] UNIQUEIDENTIFIER,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [notifications_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    [read_at] DATETIME2,
    CONSTRAINT [notifications_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[activity_logs] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [type] NVARCHAR(64) NOT NULL,
    [description] NVARCHAR(1000) NOT NULL,
    [entity_type] NVARCHAR(1000) NOT NULL,
    [entity_id] UNIQUEIDENTIFIER NOT NULL,
    [old_value] NVARCHAR(max),
    [new_value] NVARCHAR(max),
    [user_id] UNIQUEIDENTIFIER NOT NULL,
    [organization_id] UNIQUEIDENTIFIER,
    [created_by_id] UNIQUEIDENTIFIER,
    [updated_by_id] UNIQUEIDENTIFIER,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [activity_logs_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [activity_logs_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[automation_rules] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000),
    [status] NVARCHAR(64) NOT NULL CONSTRAINT [automation_rules_status_df] DEFAULT 'ACTIVE',
    [trigger_type] NVARCHAR(64) NOT NULL,
    [trigger_config] NVARCHAR(max),
    [action_type] NVARCHAR(64) NOT NULL,
    [action_config] NVARCHAR(max),
    [organization_id] UNIQUEIDENTIFIER,
    [workspace_id] UNIQUEIDENTIFIER,
    [project_id] UNIQUEIDENTIFIER,
    [execution_count] INT NOT NULL CONSTRAINT [automation_rules_execution_count_df] DEFAULT 0,
    [last_executed] DATETIME2,
    [created_by_id] UNIQUEIDENTIFIER,
    [updated_by_id] UNIQUEIDENTIFIER,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [automation_rules_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [automation_rules_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[rule_executions] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [success] BIT NOT NULL,
    [error_message] NVARCHAR(1000),
    [execution_time] INT NOT NULL,
    [trigger_data] NVARCHAR(max),
    [action_result] NVARCHAR(max),
    [rule_id] UNIQUEIDENTIFIER NOT NULL,
    [triggered_by_id] UNIQUEIDENTIFIER,
    [created_by_id] UNIQUEIDENTIFIER,
    [updated_by_id] UNIQUEIDENTIFIER,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [rule_executions_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [rule_executions_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[invitations] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [inviter_id] UNIQUEIDENTIFIER NOT NULL,
    [invitee_email] NVARCHAR(255) NOT NULL,
    [organization_id] UNIQUEIDENTIFIER,
    [workspace_id] UNIQUEIDENTIFIER,
    [project_id] UNIQUEIDENTIFIER,
    [role] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(64) NOT NULL CONSTRAINT [invitations_status_df] DEFAULT 'PENDING',
    [token] NVARCHAR(255) NOT NULL,
    [expires_at] DATETIME2 NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [invitations_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [invitations_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [invitations_token_key] UNIQUE NONCLUSTERED ([token])
);

-- CreateTable
CREATE TABLE [dbo].[project_inboxes] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [project_id] UNIQUEIDENTIFIER NOT NULL,
    [enabled] BIT NOT NULL CONSTRAINT [project_inboxes_enabled_df] DEFAULT 1,
    [name] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000),
    [email_address] NVARCHAR(255),
    [email_signature] NVARCHAR(1000),
    [auto_reply_enabled] BIT NOT NULL CONSTRAINT [project_inboxes_auto_reply_enabled_df] DEFAULT 0,
    [auto_reply_template] NVARCHAR(1000),
    [auto_create_task] BIT NOT NULL CONSTRAINT [project_inboxes_auto_create_task_df] DEFAULT 1,
    [default_task_type] NVARCHAR(64) NOT NULL CONSTRAINT [project_inboxes_default_task_type_df] DEFAULT 'TASK',
    [default_priority] NVARCHAR(64) NOT NULL CONSTRAINT [project_inboxes_default_priority_df] DEFAULT 'MEDIUM',
    [default_status_id] UNIQUEIDENTIFIER NOT NULL,
    [default_assignee_id] UNIQUEIDENTIFIER,
    [sync_interval] INT,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [project_inboxes_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [project_inboxes_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [project_inboxes_project_id_key] UNIQUE NONCLUSTERED ([project_id])
);

-- CreateTable
CREATE TABLE [dbo].[email_accounts] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [project_inbox_id] UNIQUEIDENTIFIER NOT NULL,
    [email_address] NVARCHAR(255) NOT NULL,
    [display_name] NVARCHAR(1000),
    [imap_host] NVARCHAR(1000),
    [imap_port] INT CONSTRAINT [email_accounts_imap_port_df] DEFAULT 993,
    [imap_username] NVARCHAR(1000),
    [imap_password] NVARCHAR(1000),
    [imap_use_ssl] BIT NOT NULL CONSTRAINT [email_accounts_imap_use_ssl_df] DEFAULT 1,
    [imap_tls_reject_unauthorized] BIT NOT NULL CONSTRAINT [email_accounts_imap_tls_reject_unauthorized_df] DEFAULT 1,
    [imap_tls_min_version] NVARCHAR(1000) CONSTRAINT [email_accounts_imap_tls_min_version_df] DEFAULT 'TLSv1.2',
    [imap_servername] NVARCHAR(1000),
    [imap_folder] NVARCHAR(1000) NOT NULL CONSTRAINT [email_accounts_imap_folder_df] DEFAULT 'INBOX',
    [smtp_host] NVARCHAR(1000),
    [smtp_port] INT CONSTRAINT [email_accounts_smtp_port_df] DEFAULT 587,
    [smtp_username] NVARCHAR(1000),
    [smtp_password] NVARCHAR(1000),
    [smtp_tls_reject_unauthorized] BIT NOT NULL CONSTRAINT [email_accounts_smtp_tls_reject_unauthorized_df] DEFAULT 1,
    [smtp_tls_min_version] NVARCHAR(1000) CONSTRAINT [email_accounts_smtp_tls_min_version_df] DEFAULT 'TLSv1.2',
    [smtp_servername] NVARCHAR(1000),
    [smtp_require_tls] BIT NOT NULL CONSTRAINT [email_accounts_smtp_require_tls_df] DEFAULT 0,
    [sync_enabled] BIT NOT NULL CONSTRAINT [email_accounts_sync_enabled_df] DEFAULT 1,
    [last_sync_at] DATETIME2,
    [last_sync_error] NVARCHAR(1000),
    [uid_validity] NVARCHAR(1000),
    [uid_next] INT,
    [highest_mod_seq] NVARCHAR(1000),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [email_accounts_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [email_accounts_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [email_accounts_project_inbox_id_key] UNIQUE NONCLUSTERED ([project_inbox_id]),
    CONSTRAINT [email_accounts_email_address_key] UNIQUE NONCLUSTERED ([email_address])
);

-- CreateTable
CREATE TABLE [dbo].[inbox_messages] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [project_inbox_id] UNIQUEIDENTIFIER NOT NULL,
    [message_id] NVARCHAR(255) NOT NULL,
    [imap_uid] BIGINT,
    [thread_id] NVARCHAR(255) NOT NULL,
    [in_reply_to] NVARCHAR(1000),
    [references] NVARCHAR(max) NOT NULL CONSTRAINT [inbox_messages_references_df] DEFAULT '[]',
    [subject] NVARCHAR(1000) NOT NULL,
    [from_email] NVARCHAR(1000) NOT NULL,
    [from_name] NVARCHAR(1000),
    [to_emails] NVARCHAR(max) NOT NULL CONSTRAINT [inbox_messages_to_emails_df] DEFAULT '[]',
    [cc_emails] NVARCHAR(max) NOT NULL CONSTRAINT [inbox_messages_cc_emails_df] DEFAULT '[]',
    [bcc_emails] NVARCHAR(max) NOT NULL CONSTRAINT [inbox_messages_bcc_emails_df] DEFAULT '[]',
    [reply_to] NVARCHAR(1000),
    [body_text] NVARCHAR(max),
    [body_html] NVARCHAR(max),
    [text_signature] NVARCHAR(max),
    [html_signature] NVARCHAR(max),
    [snippet] NVARCHAR(max),
    [headers] NVARCHAR(max) NOT NULL,
    [raw_size] INT,
    [has_attachments] BIT NOT NULL CONSTRAINT [inbox_messages_has_attachments_df] DEFAULT 0,
    [importance] NVARCHAR(1000),
    [converted] BIT NOT NULL CONSTRAINT [inbox_messages_converted_df] DEFAULT 0,
    [status] NVARCHAR(64) NOT NULL CONSTRAINT [inbox_messages_status_df] DEFAULT 'PENDING',
    [is_spam] BIT NOT NULL CONSTRAINT [inbox_messages_is_spam_df] DEFAULT 0,
    [spam_score] FLOAT(53),
    [converted_at] DATETIME2,
    [converted_by] UNIQUEIDENTIFIER,
    [email_date] DATETIME2 NOT NULL,
    [received_at] DATETIME2 NOT NULL CONSTRAINT [inbox_messages_received_at_df] DEFAULT CURRENT_TIMESTAMP,
    [processed_at] DATETIME2,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [inbox_messages_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [inbox_messages_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [inbox_messages_message_id_key] UNIQUE NONCLUSTERED ([message_id])
);

-- CreateTable
CREATE TABLE [dbo].[message_attachments] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [message_id] UNIQUEIDENTIFIER NOT NULL,
    [filename] NVARCHAR(1000) NOT NULL,
    [mime_type] NVARCHAR(1000) NOT NULL,
    [size] INT NOT NULL,
    [content_id] NVARCHAR(1000),
    [storage_path] NVARCHAR(1000) NOT NULL,
    [storage_url] NVARCHAR(1000),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [message_attachments_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [message_attachments_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[inbox_rules] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [project_inbox_id] UNIQUEIDENTIFIER NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000),
    [priority] INT NOT NULL CONSTRAINT [inbox_rules_priority_df] DEFAULT 0,
    [enabled] BIT NOT NULL CONSTRAINT [inbox_rules_enabled_df] DEFAULT 1,
    [conditions] NVARCHAR(max) NOT NULL,
    [actions] NVARCHAR(max) NOT NULL,
    [stop_on_match] BIT NOT NULL CONSTRAINT [inbox_rules_stop_on_match_df] DEFAULT 0,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [inbox_rules_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [inbox_rules_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[message_rule_results] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [message_id] UNIQUEIDENTIFIER NOT NULL,
    [rule_id] UNIQUEIDENTIFIER NOT NULL,
    [priority] NVARCHAR(64),
    [assignee_id] UNIQUEIDENTIFIER,
    [label_ids] NVARCHAR(max) NOT NULL CONSTRAINT [message_rule_results_label_ids_df] DEFAULT '[]',
    [task_type] NVARCHAR(1000),
    [matched] BIT NOT NULL CONSTRAINT [message_rule_results_matched_df] DEFAULT 1,
    [stopped] BIT NOT NULL CONSTRAINT [message_rule_results_stopped_df] DEFAULT 0,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [message_rule_results_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [message_rule_results_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[email_sync_logs] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [project_id] UNIQUEIDENTIFIER NOT NULL,
    [started_at] DATETIME2 NOT NULL,
    [completed_at] DATETIME2,
    [status] NVARCHAR(64) NOT NULL,
    [error] NVARCHAR(max),
    [messages_processed] INT NOT NULL CONSTRAINT [email_sync_logs_messages_processed_df] DEFAULT 0,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [email_sync_logs_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [email_sync_logs_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[trello_syncs] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [project_id] UNIQUEIDENTIFIER,
    [workspace_id] UNIQUEIDENTIFIER,
    [trello_workspace_id] NVARCHAR(1000),
    [trello_board_id] NVARCHAR(1000),
    [trello_api_key] NVARCHAR(1000) NOT NULL,
    [trello_token] NVARCHAR(1000) NOT NULL,
    [sync_enabled] BIT NOT NULL CONSTRAINT [trello_syncs_sync_enabled_df] DEFAULT 1,
    [sync_interval] INT NOT NULL CONSTRAINT [trello_syncs_sync_interval_df] DEFAULT 15,
    [last_sync_at] DATETIME2,
    [last_sync_status] NVARCHAR(64),
    [last_sync_error] NVARCHAR(max),
    [cards_imported] INT NOT NULL CONSTRAINT [trello_syncs_cards_imported_df] DEFAULT 0,
    [status_mappings] NVARCHAR(max),
    [created_by_id] UNIQUEIDENTIFIER,
    [updated_by_id] UNIQUEIDENTIFIER,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [trello_syncs_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [trello_syncs_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[jira_syncs] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [project_id] UNIQUEIDENTIFIER,
    [workspace_id] UNIQUEIDENTIFIER,
    [jira_site_url] NVARCHAR(1000) NOT NULL,
    [jira_project_key] NVARCHAR(1000),
    [jira_email] NVARCHAR(1000) NOT NULL,
    [jira_api_token] NVARCHAR(1000) NOT NULL,
    [sync_enabled] BIT NOT NULL CONSTRAINT [jira_syncs_sync_enabled_df] DEFAULT 1,
    [sync_interval] INT NOT NULL CONSTRAINT [jira_syncs_sync_interval_df] DEFAULT 15,
    [last_sync_at] DATETIME2,
    [last_sync_status] NVARCHAR(64),
    [last_sync_error] NVARCHAR(max),
    [issues_imported] INT NOT NULL CONSTRAINT [jira_syncs_issues_imported_df] DEFAULT 0,
    [status_mappings] NVARCHAR(max),
    [created_by_id] UNIQUEIDENTIFIER,
    [updated_by_id] UNIQUEIDENTIFIER,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [jira_syncs_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [jira_syncs_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[settings] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [key] NVARCHAR(1000) NOT NULL,
    [value] NVARCHAR(1000),
    [description] NVARCHAR(1000),
    [category] NVARCHAR(1000) NOT NULL CONSTRAINT [settings_category_df] DEFAULT 'general',
    [is_encrypted] BIT NOT NULL CONSTRAINT [settings_is_encrypted_df] DEFAULT 0,
    [userId] UNIQUEIDENTIFIER,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [settings_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [settings_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[media_assets] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [userId] UNIQUEIDENTIFIER NOT NULL,
    [assetType] NVARCHAR(255) NOT NULL,
    [storageKey] NVARCHAR(1000) NOT NULL,
    [filename] NVARCHAR(1000) NOT NULL,
    [mimeType] NVARCHAR(1000) NOT NULL,
    [size] INT NOT NULL,
    [fileHash] NVARCHAR(1000),
    [inCloud] BIT NOT NULL CONSTRAINT [media_assets_inCloud_df] DEFAULT 0,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [media_assets_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [media_assets_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[conversations] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [title] NVARCHAR(1000) NOT NULL CONSTRAINT [conversations_title_df] DEFAULT 'New Chat',
    [session_id] NVARCHAR(255) NOT NULL,
    [user_id] UNIQUEIDENTIFIER NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [conversations_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [conversations_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [conversations_session_id_key] UNIQUE NONCLUSTERED ([session_id])
);

-- CreateTable
CREATE TABLE [dbo].[chat_messages] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [role] NVARCHAR(1000) NOT NULL,
    [content] NVARCHAR(max) NOT NULL,
    [conversation_id] UNIQUEIDENTIFIER NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [chat_messages_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [chat_messages_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [users_default_organization_id_idx] ON [dbo].[users]([default_organization_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [organizations_owner_id_idx] ON [dbo].[organizations]([owner_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [organizations_created_by_id_idx] ON [dbo].[organizations]([created_by_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [organizations_updated_by_id_idx] ON [dbo].[organizations]([updated_by_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [organization_members_organization_id_idx] ON [dbo].[organization_members]([organization_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [organization_members_created_by_id_idx] ON [dbo].[organization_members]([created_by_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [organization_members_updated_by_id_idx] ON [dbo].[organization_members]([updated_by_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [workspaces_parent_workspace_id_idx] ON [dbo].[workspaces]([parent_workspace_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [workspaces_created_by_id_idx] ON [dbo].[workspaces]([created_by_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [workspaces_updated_by_id_idx] ON [dbo].[workspaces]([updated_by_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [workspace_members_workspace_id_idx] ON [dbo].[workspace_members]([workspace_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [workspace_members_created_by_id_idx] ON [dbo].[workspace_members]([created_by_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [workspace_members_updated_by_id_idx] ON [dbo].[workspace_members]([updated_by_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [projects_workflow_id_idx] ON [dbo].[projects]([workflow_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [projects_created_by_id_idx] ON [dbo].[projects]([created_by_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [projects_updated_by_id_idx] ON [dbo].[projects]([updated_by_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [project_members_project_id_idx] ON [dbo].[project_members]([project_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [project_members_created_by_id_idx] ON [dbo].[project_members]([created_by_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [project_members_updated_by_id_idx] ON [dbo].[project_members]([updated_by_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [tasks_email_thread_id_idx] ON [dbo].[tasks]([email_thread_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [tasks_inbox_message_id_idx] ON [dbo].[tasks]([inbox_message_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [tasks_parent_task_id_idx] ON [dbo].[tasks]([parent_task_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [tasks_created_by_id_idx] ON [dbo].[tasks]([created_by_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [tasks_updated_by_id_idx] ON [dbo].[tasks]([updated_by_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [tasks_archived_by_idx] ON [dbo].[tasks]([archived_by]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [tasks_sprint_id_idx] ON [dbo].[tasks]([sprint_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [tasks_status_id_idx] ON [dbo].[tasks]([status_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [recurring_tasks_task_id_idx] ON [dbo].[recurring_tasks]([task_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [task_ranks_scope_type_scope_id_view_type_rank_idx] ON [dbo].[task_ranks]([scope_type], [scope_id], [view_type], [rank]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [task_dependencies_blocking_task_id_idx] ON [dbo].[task_dependencies]([blocking_task_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [task_dependencies_created_by_id_idx] ON [dbo].[task_dependencies]([created_by_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [task_dependencies_updated_by_id_idx] ON [dbo].[task_dependencies]([updated_by_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [workflows_organization_id_idx] ON [dbo].[workflows]([organization_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [workflows_created_by_id_idx] ON [dbo].[workflows]([created_by_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [workflows_updated_by_id_idx] ON [dbo].[workflows]([updated_by_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [task_statuses_created_by_id_idx] ON [dbo].[task_statuses]([created_by_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [task_statuses_updated_by_id_idx] ON [dbo].[task_statuses]([updated_by_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [task_statuses_deleted_by_idx] ON [dbo].[task_statuses]([deleted_by]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [status_transitions_from_status_id_idx] ON [dbo].[status_transitions]([from_status_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [status_transitions_to_status_id_idx] ON [dbo].[status_transitions]([to_status_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [status_transitions_created_by_id_idx] ON [dbo].[status_transitions]([created_by_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [status_transitions_updated_by_id_idx] ON [dbo].[status_transitions]([updated_by_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [sprints_created_by_id_idx] ON [dbo].[sprints]([created_by_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [sprints_updated_by_id_idx] ON [dbo].[sprints]([updated_by_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [labels_created_by_id_idx] ON [dbo].[labels]([created_by_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [labels_updated_by_id_idx] ON [dbo].[labels]([updated_by_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [workspace_labels_workspace_id_idx] ON [dbo].[workspace_labels]([workspace_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [workspace_labels_label_id_idx] ON [dbo].[workspace_labels]([label_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [task_labels_label_id_idx] ON [dbo].[task_labels]([label_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [task_labels_task_id_idx] ON [dbo].[task_labels]([task_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [task_labels_created_by_id_idx] ON [dbo].[task_labels]([created_by_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [task_labels_updated_by_id_idx] ON [dbo].[task_labels]([updated_by_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [task_assignees_task_id_idx] ON [dbo].[task_assignees]([task_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [task_assignees_user_id_idx] ON [dbo].[task_assignees]([user_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [task_reporters_task_id_idx] ON [dbo].[task_reporters]([task_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [task_reporters_user_id_idx] ON [dbo].[task_reporters]([user_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [task_watchers_user_id_idx] ON [dbo].[task_watchers]([user_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [task_watchers_created_by_id_idx] ON [dbo].[task_watchers]([created_by_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [task_watchers_updated_by_id_idx] ON [dbo].[task_watchers]([updated_by_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [task_comments_author_id_idx] ON [dbo].[task_comments]([author_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [task_comments_created_by_id_idx] ON [dbo].[task_comments]([created_by_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [task_comments_updated_by_id_idx] ON [dbo].[task_comments]([updated_by_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [task_comments_parent_comment_id_idx] ON [dbo].[task_comments]([parent_comment_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [task_comments_task_id_idx] ON [dbo].[task_comments]([task_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [task_attachments_task_id_idx] ON [dbo].[task_attachments]([task_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [task_attachments_created_by_id_idx] ON [dbo].[task_attachments]([created_by_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [task_attachments_updated_by_id_idx] ON [dbo].[task_attachments]([updated_by_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [public_task_shares_token_idx] ON [dbo].[public_task_shares]([token]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [public_task_shares_task_id_idx] ON [dbo].[public_task_shares]([task_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [public_task_shares_created_by_id_idx] ON [dbo].[public_task_shares]([created_by_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [time_entries_task_id_idx] ON [dbo].[time_entries]([task_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [time_entries_user_id_idx] ON [dbo].[time_entries]([user_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [time_entries_created_by_id_idx] ON [dbo].[time_entries]([created_by_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [time_entries_updated_by_id_idx] ON [dbo].[time_entries]([updated_by_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [custom_fields_created_by_id_idx] ON [dbo].[custom_fields]([created_by_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [custom_fields_updated_by_id_idx] ON [dbo].[custom_fields]([updated_by_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [notifications_user_id_idx] ON [dbo].[notifications]([user_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [notifications_organization_id_idx] ON [dbo].[notifications]([organization_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [notifications_created_by_id_idx] ON [dbo].[notifications]([created_by_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [notifications_updated_by_id_idx] ON [dbo].[notifications]([updated_by_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [activity_logs_user_id_idx] ON [dbo].[activity_logs]([user_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [activity_logs_organization_id_idx] ON [dbo].[activity_logs]([organization_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [activity_logs_created_by_id_idx] ON [dbo].[activity_logs]([created_by_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [activity_logs_updated_by_id_idx] ON [dbo].[activity_logs]([updated_by_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [automation_rules_created_by_id_idx] ON [dbo].[automation_rules]([created_by_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [automation_rules_updated_by_id_idx] ON [dbo].[automation_rules]([updated_by_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [automation_rules_organization_id_idx] ON [dbo].[automation_rules]([organization_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [automation_rules_project_id_idx] ON [dbo].[automation_rules]([project_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [automation_rules_workspace_id_idx] ON [dbo].[automation_rules]([workspace_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [rule_executions_rule_id_idx] ON [dbo].[rule_executions]([rule_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [rule_executions_triggered_by_id_idx] ON [dbo].[rule_executions]([triggered_by_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [rule_executions_created_by_id_idx] ON [dbo].[rule_executions]([created_by_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [rule_executions_updated_by_id_idx] ON [dbo].[rule_executions]([updated_by_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [invitations_organization_id_idx] ON [dbo].[invitations]([organization_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [invitations_workspace_id_idx] ON [dbo].[invitations]([workspace_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [invitations_project_id_idx] ON [dbo].[invitations]([project_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [invitations_token_idx] ON [dbo].[invitations]([token]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [invitations_invitee_email_idx] ON [dbo].[invitations]([invitee_email]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [invitations_inviter_id_idx] ON [dbo].[invitations]([inviter_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [project_inboxes_project_id_idx] ON [dbo].[project_inboxes]([project_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [project_inboxes_default_status_id_idx] ON [dbo].[project_inboxes]([default_status_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [project_inboxes_default_assignee_id_idx] ON [dbo].[project_inboxes]([default_assignee_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [email_accounts_project_inbox_id_idx] ON [dbo].[email_accounts]([project_inbox_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [inbox_messages_thread_id_idx] ON [dbo].[inbox_messages]([thread_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [inbox_messages_status_idx] ON [dbo].[inbox_messages]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [inbox_messages_email_date_idx] ON [dbo].[inbox_messages]([email_date]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [inbox_messages_imap_uid_idx] ON [dbo].[inbox_messages]([imap_uid]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [inbox_messages_converted_by_idx] ON [dbo].[inbox_messages]([converted_by]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [message_attachments_message_id_idx] ON [dbo].[message_attachments]([message_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [inbox_rules_project_inbox_id_enabled_priority_idx] ON [dbo].[inbox_rules]([project_inbox_id], [enabled], [priority]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [message_rule_results_message_id_idx] ON [dbo].[message_rule_results]([message_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [message_rule_results_rule_id_idx] ON [dbo].[message_rule_results]([rule_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [email_sync_logs_project_id_started_at_idx] ON [dbo].[email_sync_logs]([project_id], [started_at]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [trello_syncs_workspace_id_idx] ON [dbo].[trello_syncs]([workspace_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [trello_syncs_project_id_idx] ON [dbo].[trello_syncs]([project_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [trello_syncs_created_by_id_idx] ON [dbo].[trello_syncs]([created_by_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [trello_syncs_updated_by_id_idx] ON [dbo].[trello_syncs]([updated_by_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [jira_syncs_workspace_id_idx] ON [dbo].[jira_syncs]([workspace_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [jira_syncs_project_id_idx] ON [dbo].[jira_syncs]([project_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [jira_syncs_created_by_id_idx] ON [dbo].[jira_syncs]([created_by_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [jira_syncs_updated_by_id_idx] ON [dbo].[jira_syncs]([updated_by_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [media_assets_userId_idx] ON [dbo].[media_assets]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [media_assets_assetType_idx] ON [dbo].[media_assets]([assetType]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [conversations_user_id_idx] ON [dbo].[conversations]([user_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [conversations_updated_at_idx] ON [dbo].[conversations]([updated_at]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [chat_messages_conversation_id_idx] ON [dbo].[chat_messages]([conversation_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [chat_messages_created_at_idx] ON [dbo].[chat_messages]([created_at]);


CREATE UNIQUE INDEX [users_username_key] ON [dbo].[users] ([username]) WHERE [username] IS NOT NULL;

CREATE UNIQUE INDEX [users_reset_token_key] ON [dbo].[users] ([reset_token]) WHERE [reset_token] IS NOT NULL;

CREATE UNIQUE INDEX [users_external_id_key] ON [dbo].[users] ([external_id]) WHERE [external_id] IS NOT NULL;

ALTER TABLE [dbo].[users] ADD CONSTRAINT [CK_users_role_enum] CHECK ([role] IN (N'SUPER_ADMIN',N'OWNER',N'MANAGER',N'MEMBER',N'VIEWER'));

ALTER TABLE [dbo].[users] ADD CONSTRAINT [CK_users_status_enum] CHECK ([status] IN (N'ACTIVE',N'INACTIVE',N'SUSPENDED',N'PENDING'));

ALTER TABLE [dbo].[users] ADD CONSTRAINT [CK_users_preferences_json] CHECK ([preferences] IS NULL OR ISJSON([preferences], VALUE)=1);

ALTER TABLE [dbo].[users] ADD CONSTRAINT [CK_users_onboardInfo_json] CHECK ([onboardInfo] IS NULL OR ISJSON([onboardInfo], VALUE)=1);

ALTER TABLE [dbo].[users] ADD CONSTRAINT [FK_users_defaultOrganization] FOREIGN KEY ([default_organization_id]) REFERENCES [dbo].[organizations] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[users] ADD CONSTRAINT [CK_users_source_enum] CHECK ([source] IN (N'MANUAL',N'EMAIL_INBOX',N'SSO',N'API',N'IMPORT',N'SIGNUP'));

ALTER TABLE [dbo].[organizations] ADD CONSTRAINT [CK_organizations_settings_json] CHECK ([settings] IS NULL OR ISJSON([settings], VALUE)=1);

ALTER TABLE [dbo].[organizations] ADD CONSTRAINT [FK_organizations_owner] FOREIGN KEY ([owner_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[organizations] ADD CONSTRAINT [FK_organizations_createdByUser] FOREIGN KEY ([created_by_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[organizations] ADD CONSTRAINT [FK_organizations_updatedByUser] FOREIGN KEY ([updated_by_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[organization_members] ADD CONSTRAINT [CK_organization_members_role_enum] CHECK ([role] IN (N'SUPER_ADMIN',N'OWNER',N'MANAGER',N'MEMBER',N'VIEWER'));

ALTER TABLE [dbo].[organization_members] ADD CONSTRAINT [FK_organization_members_organization] FOREIGN KEY ([organization_id]) REFERENCES [dbo].[organizations] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[organization_members] ADD CONSTRAINT [FK_organization_members_user] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[organization_members] ADD CONSTRAINT [FK_organization_members_createdByUser] FOREIGN KEY ([created_by_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[organization_members] ADD CONSTRAINT [FK_organization_members_updatedByUser] FOREIGN KEY ([updated_by_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[workspaces] ADD CONSTRAINT [CK_workspaces_settings_json] CHECK ([settings] IS NULL OR ISJSON([settings], VALUE)=1);

ALTER TABLE [dbo].[workspaces] ADD CONSTRAINT [FK_workspaces_organization] FOREIGN KEY ([organization_id]) REFERENCES [dbo].[organizations] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[workspaces] ADD CONSTRAINT [FK_workspaces_parentWorkspace] FOREIGN KEY ([parent_workspace_id]) REFERENCES [dbo].[workspaces] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[workspaces] ADD CONSTRAINT [FK_workspaces_createdByUser] FOREIGN KEY ([created_by_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[workspaces] ADD CONSTRAINT [FK_workspaces_updatedByUser] FOREIGN KEY ([updated_by_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[workspace_members] ADD CONSTRAINT [CK_workspace_members_role_enum] CHECK ([role] IN (N'SUPER_ADMIN',N'OWNER',N'MANAGER',N'MEMBER',N'VIEWER'));

ALTER TABLE [dbo].[workspace_members] ADD CONSTRAINT [FK_workspace_members_user] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[workspace_members] ADD CONSTRAINT [FK_workspace_members_workspace] FOREIGN KEY ([workspace_id]) REFERENCES [dbo].[workspaces] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[workspace_members] ADD CONSTRAINT [FK_workspace_members_createdByUser] FOREIGN KEY ([created_by_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[workspace_members] ADD CONSTRAINT [FK_workspace_members_updatedByUser] FOREIGN KEY ([updated_by_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[projects] ADD CONSTRAINT [CK_projects_status_enum] CHECK ([status] IN (N'PLANNING',N'ACTIVE',N'ON_HOLD',N'COMPLETED',N'CANCELLED'));

ALTER TABLE [dbo].[projects] ADD CONSTRAINT [CK_projects_priority_enum] CHECK ([priority] IN (N'LOW',N'MEDIUM',N'HIGH',N'URGENT'));

ALTER TABLE [dbo].[projects] ADD CONSTRAINT [CK_projects_visibility_enum] CHECK ([visibility] IN (N'PRIVATE',N'INTERNAL',N'PUBLIC'));

ALTER TABLE [dbo].[projects] ADD CONSTRAINT [CK_projects_settings_json] CHECK ([settings] IS NULL OR ISJSON([settings], VALUE)=1);

ALTER TABLE [dbo].[projects] ADD CONSTRAINT [FK_projects_workspace] FOREIGN KEY ([workspace_id]) REFERENCES [dbo].[workspaces] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[projects] ADD CONSTRAINT [FK_projects_workflow] FOREIGN KEY ([workflow_id]) REFERENCES [dbo].[workflows] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[projects] ADD CONSTRAINT [FK_projects_createdByUser] FOREIGN KEY ([created_by_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[projects] ADD CONSTRAINT [FK_projects_updatedByUser] FOREIGN KEY ([updated_by_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[project_members] ADD CONSTRAINT [CK_project_members_role_enum] CHECK ([role] IN (N'SUPER_ADMIN',N'OWNER',N'MANAGER',N'MEMBER',N'VIEWER'));

ALTER TABLE [dbo].[project_members] ADD CONSTRAINT [FK_project_members_project] FOREIGN KEY ([project_id]) REFERENCES [dbo].[projects] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[project_members] ADD CONSTRAINT [FK_project_members_user] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[project_members] ADD CONSTRAINT [FK_project_members_createdByUser] FOREIGN KEY ([created_by_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[project_members] ADD CONSTRAINT [FK_project_members_updatedByUser] FOREIGN KEY ([updated_by_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE UNIQUE INDEX [tasks_inbox_message_id_key] ON [dbo].[tasks] ([inbox_message_id]) WHERE [inbox_message_id] IS NOT NULL;

CREATE UNIQUE INDEX [tasks_trello_card_id_key] ON [dbo].[tasks] ([trello_card_id]) WHERE [trello_card_id] IS NOT NULL;

CREATE UNIQUE INDEX [tasks_jira_issue_id_key] ON [dbo].[tasks] ([jira_issue_id]) WHERE [jira_issue_id] IS NOT NULL;

ALTER TABLE [dbo].[tasks] ADD CONSTRAINT [CK_tasks_type_enum] CHECK ([type] IN (N'TASK',N'BUG',N'EPIC',N'STORY',N'SUBTASK'));

ALTER TABLE [dbo].[tasks] ADD CONSTRAINT [CK_tasks_priority_enum] CHECK ([priority] IN (N'LOWEST',N'LOW',N'MEDIUM',N'HIGH',N'HIGHEST'));

ALTER TABLE [dbo].[tasks] ADD CONSTRAINT [CK_tasks_custom_fields_json] CHECK ([custom_fields] IS NULL OR ISJSON([custom_fields], VALUE)=1);

ALTER TABLE [dbo].[tasks] ADD CONSTRAINT [FK_tasks_inboxMessage] FOREIGN KEY ([inbox_message_id]) REFERENCES [dbo].[inbox_messages] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[tasks] ADD CONSTRAINT [FK_tasks_parentTask] FOREIGN KEY ([parent_task_id]) REFERENCES [dbo].[tasks] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[tasks] ADD CONSTRAINT [FK_tasks_project] FOREIGN KEY ([project_id]) REFERENCES [dbo].[projects] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[tasks] ADD CONSTRAINT [FK_tasks_createdByUser] FOREIGN KEY ([created_by_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[tasks] ADD CONSTRAINT [FK_tasks_updatedByUser] FOREIGN KEY ([updated_by_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[tasks] ADD CONSTRAINT [FK_tasks_archiveByUser] FOREIGN KEY ([archived_by]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[tasks] ADD CONSTRAINT [FK_tasks_sprint] FOREIGN KEY ([sprint_id]) REFERENCES [dbo].[sprints] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[tasks] ADD CONSTRAINT [FK_tasks_status] FOREIGN KEY ([status_id]) REFERENCES [dbo].[task_statuses] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[recurring_tasks] ADD CONSTRAINT [CK_recurring_tasks_recurrence_type_enum] CHECK ([recurrence_type] IN (N'DAILY',N'WEEKLY',N'MONTHLY',N'QUARTERLY',N'YEARLY',N'CUSTOM'));

ALTER TABLE [dbo].[recurring_tasks] ADD CONSTRAINT [CK_recurring_tasks_days_of_week_json] CHECK ([days_of_week] IS NULL OR ISJSON([days_of_week], VALUE)=1);

ALTER TABLE [dbo].[recurring_tasks] ADD CONSTRAINT [CK_recurring_tasks_end_type_enum] CHECK ([end_type] IN (N'NEVER',N'ON_DATE',N'AFTER_OCCURRENCES'));

ALTER TABLE [dbo].[recurring_tasks] ADD CONSTRAINT [FK_recurring_tasks_task] FOREIGN KEY ([task_id]) REFERENCES [dbo].[tasks] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[task_ranks] ADD CONSTRAINT [CK_task_ranks_scope_type_enum] CHECK ([scope_type] IN (N'ORGANIZATION',N'WORKSPACE',N'PROJECT'));

ALTER TABLE [dbo].[task_ranks] ADD CONSTRAINT [CK_task_ranks_view_type_enum] CHECK ([view_type] IN (N'LIST',N'BOARD',N'GANTT'));

ALTER TABLE [dbo].[task_ranks] ADD CONSTRAINT [FK_task_ranks_task] FOREIGN KEY ([task_id]) REFERENCES [dbo].[tasks] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[task_dependencies] ADD CONSTRAINT [CK_task_dependencies_type_enum] CHECK ([type] IN (N'BLOCKS',N'FINISH_START',N'START_START',N'FINISH_FINISH',N'START_FINISH'));

ALTER TABLE [dbo].[task_dependencies] ADD CONSTRAINT [FK_task_dependencies_blockingTask] FOREIGN KEY ([blocking_task_id]) REFERENCES [dbo].[tasks] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[task_dependencies] ADD CONSTRAINT [FK_task_dependencies_createdByUser] FOREIGN KEY ([created_by_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[task_dependencies] ADD CONSTRAINT [FK_task_dependencies_updatedByUser] FOREIGN KEY ([updated_by_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[task_dependencies] ADD CONSTRAINT [FK_task_dependencies_dependentTask] FOREIGN KEY ([dependent_task_id]) REFERENCES [dbo].[tasks] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[workflows] ADD CONSTRAINT [FK_workflows_organization] FOREIGN KEY ([organization_id]) REFERENCES [dbo].[organizations] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[workflows] ADD CONSTRAINT [FK_workflows_createdByUser] FOREIGN KEY ([created_by_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[workflows] ADD CONSTRAINT [FK_workflows_updatedByUser] FOREIGN KEY ([updated_by_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[task_statuses] ADD CONSTRAINT [CK_task_statuses_category_enum] CHECK ([category] IN (N'TODO',N'IN_PROGRESS',N'DONE'));

ALTER TABLE [dbo].[task_statuses] ADD CONSTRAINT [FK_task_statuses_workflow] FOREIGN KEY ([workflow_id]) REFERENCES [dbo].[workflows] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[task_statuses] ADD CONSTRAINT [FK_task_statuses_createdByUser] FOREIGN KEY ([created_by_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[task_statuses] ADD CONSTRAINT [FK_task_statuses_updatedByUser] FOREIGN KEY ([updated_by_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[task_statuses] ADD CONSTRAINT [FK_task_statuses_deletedByUser] FOREIGN KEY ([deleted_by]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[status_transitions] ADD CONSTRAINT [FK_status_transitions_fromStatus] FOREIGN KEY ([from_status_id]) REFERENCES [dbo].[task_statuses] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[status_transitions] ADD CONSTRAINT [FK_status_transitions_toStatus] FOREIGN KEY ([to_status_id]) REFERENCES [dbo].[task_statuses] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[status_transitions] ADD CONSTRAINT [FK_status_transitions_workflow] FOREIGN KEY ([workflow_id]) REFERENCES [dbo].[workflows] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[status_transitions] ADD CONSTRAINT [FK_status_transitions_createdByUser] FOREIGN KEY ([created_by_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[status_transitions] ADD CONSTRAINT [FK_status_transitions_updatedByUser] FOREIGN KEY ([updated_by_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE UNIQUE INDEX [sprints_project_id_slug_key] ON [dbo].[sprints] ([project_id],[slug]) WHERE [slug] IS NOT NULL;

ALTER TABLE [dbo].[sprints] ADD CONSTRAINT [CK_sprints_status_enum] CHECK ([status] IN (N'PLANNING',N'ACTIVE',N'COMPLETED',N'CANCELLED'));

ALTER TABLE [dbo].[sprints] ADD CONSTRAINT [FK_sprints_project] FOREIGN KEY ([project_id]) REFERENCES [dbo].[projects] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[sprints] ADD CONSTRAINT [FK_sprints_createdByUser] FOREIGN KEY ([created_by_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[sprints] ADD CONSTRAINT [FK_sprints_updatedByUser] FOREIGN KEY ([updated_by_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[labels] ADD CONSTRAINT [FK_labels_project] FOREIGN KEY ([project_id]) REFERENCES [dbo].[projects] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[labels] ADD CONSTRAINT [FK_labels_createdByUser] FOREIGN KEY ([created_by_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[labels] ADD CONSTRAINT [FK_labels_updatedByUser] FOREIGN KEY ([updated_by_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[workspace_labels] ADD CONSTRAINT [FK_workspace_labels_workspace] FOREIGN KEY ([workspace_id]) REFERENCES [dbo].[workspaces] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[workspace_labels] ADD CONSTRAINT [FK_workspace_labels_label] FOREIGN KEY ([label_id]) REFERENCES [dbo].[labels] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[task_labels] ADD CONSTRAINT [FK_task_labels_label] FOREIGN KEY ([label_id]) REFERENCES [dbo].[labels] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[task_labels] ADD CONSTRAINT [FK_task_labels_task] FOREIGN KEY ([task_id]) REFERENCES [dbo].[tasks] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[task_labels] ADD CONSTRAINT [FK_task_labels_createdByUser] FOREIGN KEY ([created_by_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[task_labels] ADD CONSTRAINT [FK_task_labels_updatedByUser] FOREIGN KEY ([updated_by_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[task_assignees] ADD CONSTRAINT [FK_task_assignees_task] FOREIGN KEY ([task_id]) REFERENCES [dbo].[tasks] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[task_assignees] ADD CONSTRAINT [FK_task_assignees_user] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[task_reporters] ADD CONSTRAINT [FK_task_reporters_task] FOREIGN KEY ([task_id]) REFERENCES [dbo].[tasks] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[task_reporters] ADD CONSTRAINT [FK_task_reporters_user] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[task_watchers] ADD CONSTRAINT [FK_task_watchers_task] FOREIGN KEY ([task_id]) REFERENCES [dbo].[tasks] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[task_watchers] ADD CONSTRAINT [FK_task_watchers_user] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[task_watchers] ADD CONSTRAINT [FK_task_watchers_createdByUser] FOREIGN KEY ([created_by_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[task_watchers] ADD CONSTRAINT [FK_task_watchers_updatedByUser] FOREIGN KEY ([updated_by_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE UNIQUE INDEX [task_comments_email_message_id_key] ON [dbo].[task_comments] ([email_message_id]) WHERE [email_message_id] IS NOT NULL;

ALTER TABLE [dbo].[task_comments] ADD CONSTRAINT [CK_task_comments_email_recipients_json] CHECK ([email_recipients] IS NULL OR ISJSON([email_recipients], VALUE)=1);

ALTER TABLE [dbo].[task_comments] ADD CONSTRAINT [FK_task_comments_author] FOREIGN KEY ([author_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[task_comments] ADD CONSTRAINT [FK_task_comments_createdByUser] FOREIGN KEY ([created_by_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[task_comments] ADD CONSTRAINT [FK_task_comments_updatedByUser] FOREIGN KEY ([updated_by_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[task_comments] ADD CONSTRAINT [FK_task_comments_parentComment] FOREIGN KEY ([parent_comment_id]) REFERENCES [dbo].[task_comments] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[task_comments] ADD CONSTRAINT [FK_task_comments_task] FOREIGN KEY ([task_id]) REFERENCES [dbo].[tasks] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[task_attachments] ADD CONSTRAINT [FK_task_attachments_task] FOREIGN KEY ([task_id]) REFERENCES [dbo].[tasks] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[task_attachments] ADD CONSTRAINT [FK_task_attachments_createdByUser] FOREIGN KEY ([created_by_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[task_attachments] ADD CONSTRAINT [FK_task_attachments_updatedByUser] FOREIGN KEY ([updated_by_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[public_task_shares] ADD CONSTRAINT [FK_public_task_shares_task] FOREIGN KEY ([task_id]) REFERENCES [dbo].[tasks] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[public_task_shares] ADD CONSTRAINT [FK_public_task_shares_createdByUser] FOREIGN KEY ([created_by_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[time_entries] ADD CONSTRAINT [FK_time_entries_task] FOREIGN KEY ([task_id]) REFERENCES [dbo].[tasks] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[time_entries] ADD CONSTRAINT [FK_time_entries_user] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[time_entries] ADD CONSTRAINT [FK_time_entries_createdByUser] FOREIGN KEY ([created_by_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[time_entries] ADD CONSTRAINT [FK_time_entries_updatedByUser] FOREIGN KEY ([updated_by_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[custom_fields] ADD CONSTRAINT [CK_custom_fields_type_enum] CHECK ([type] IN (N'TEXT',N'NUMBER',N'DATE',N'BOOLEAN',N'SELECT',N'MULTI_SELECT',N'USER',N'URL'));

ALTER TABLE [dbo].[custom_fields] ADD CONSTRAINT [CK_custom_fields_options_json] CHECK ([options] IS NULL OR ISJSON([options], VALUE)=1);

ALTER TABLE [dbo].[custom_fields] ADD CONSTRAINT [FK_custom_fields_organization] FOREIGN KEY ([organization_id]) REFERENCES [dbo].[organizations] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[custom_fields] ADD CONSTRAINT [FK_custom_fields_createdByUser] FOREIGN KEY ([created_by_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[custom_fields] ADD CONSTRAINT [FK_custom_fields_updatedByUser] FOREIGN KEY ([updated_by_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[notifications] ADD CONSTRAINT [CK_notifications_type_enum] CHECK ([type] IN (N'TASK_ASSIGNED',N'TASK_STATUS_CHANGED',N'TASK_COMMENTED',N'TASK_DUE_SOON',N'PROJECT_CREATED',N'PROJECT_UPDATED',N'WORKSPACE_INVITED',N'MENTION',N'SYSTEM'));

ALTER TABLE [dbo].[notifications] ADD CONSTRAINT [CK_notifications_priority_enum] CHECK ([priority] IN (N'LOW',N'MEDIUM',N'HIGH',N'URGENT'));

ALTER TABLE [dbo].[notifications] ADD CONSTRAINT [FK_notifications_user] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[notifications] ADD CONSTRAINT [FK_notifications_organization] FOREIGN KEY ([organization_id]) REFERENCES [dbo].[organizations] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[notifications] ADD CONSTRAINT [FK_notifications_createdByUser] FOREIGN KEY ([created_by_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[notifications] ADD CONSTRAINT [FK_notifications_updatedByUser] FOREIGN KEY ([updated_by_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[activity_logs] ADD CONSTRAINT [CK_activity_logs_type_enum] CHECK ([type] IN (N'TASK_CREATED',N'TASK_UPDATED',N'TASK_DELETED',N'TASK_ASSIGNED',N'TASK_COMMENTED',N'TASK_LABEL_ADDED',N'TASK_LABEL_REMOVED',N'TASK_STATUS_CHANGED',N'TASK_ATTACHMENT_ADDED',N'TASK_ATTACHMENT_REMOVED',N'TASK_PRIORITY_CHANGED',N'TASK_DUE_DATE_CHANGED',N'TASK_WATCHER_ADDED',N'TASK_WATCHER_REMOVED',N'TASK_DEPENDENCY_ADDED',N'TASK_DEPENDENCY_REMOVED',N'TASK_MOVED_TO_SPRINT',N'TASK_TIME_LOGGED',N'PROJECT_CREATED',N'PROJECT_UPDATED',N'PROJECT_DELETED',N'PROJECT_ARCHIVED',N'PROJECT_UNARCHIVED',N'PROJECT_MEMBER_ADDED',N'PROJECT_MEMBER_REMOVED',N'PROJECT_STATUS_CHANGED',N'SPRINT_CREATED',N'SPRINT_UPDATED',N'SPRINT_DELETED',N'SPRINT_STARTED',N'SPRINT_COMPLETED',N'SPRINT_CANCELLED',N'WORKSPACE_CREATED',N'WORKSPACE_UPDATED',N'WORKSPACE_DELETED',N'WORKSPACE_MEMBER_ADDED',N'WORKSPACE_MEMBER_REMOVED',N'ORGANIZATION_CREATED',N'ORGANIZATION_UPDATED',N'ORGANIZATION_MEMBER_ADDED',N'ORGANIZATION_MEMBER_REMOVED',N'WORKFLOW_CREATED',N'WORKFLOW_UPDATED',N'WORKFLOW_DELETED',N'STATUS_ADDED',N'STATUS_UPDATED',N'STATUS_DELETED',N'TRANSITION_ADDED',N'TRANSITION_REMOVED',N'LABEL_CREATED',N'LABEL_UPDATED',N'LABEL_DELETED',N'INBOX_CONFIGURED',N'INBOX_MESSAGE_RECEIVED',N'INBOX_MESSAGE_CONVERTED',N'INBOX_RULE_CREATED',N'INBOX_RULE_UPDATED',N'EMAIL_ACCOUNT_CONNECTED',N'EMAIL_SYNC_COMPLETED',N'AUTOMATION_RULE_CREATED',N'AUTOMATION_RULE_UPDATED',N'AUTOMATION_RULE_EXECUTED',N'AUTOMATION_RULE_DELETED',N'USER_JOINED',N'USER_LEFT',N'USER_ROLE_CHANGED',N'INVITATION_SENT',N'INVITATION_RESENT',N'INVITATION_ACCEPTED',N'INVITATION_DECLINED',N'INVITATION_DELETED',N'COMMENT_CREATED',N'COMMENT_UPDATED',N'COMMENT_DELETED',N'COMMENT_REPLY_ADDED'));

ALTER TABLE [dbo].[activity_logs] ADD CONSTRAINT [CK_activity_logs_old_value_json] CHECK ([old_value] IS NULL OR ISJSON([old_value], VALUE)=1);

ALTER TABLE [dbo].[activity_logs] ADD CONSTRAINT [CK_activity_logs_new_value_json] CHECK ([new_value] IS NULL OR ISJSON([new_value], VALUE)=1);

ALTER TABLE [dbo].[activity_logs] ADD CONSTRAINT [FK_activity_logs_user] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[activity_logs] ADD CONSTRAINT [FK_activity_logs_organization] FOREIGN KEY ([organization_id]) REFERENCES [dbo].[organizations] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[activity_logs] ADD CONSTRAINT [FK_activity_logs_createdByUser] FOREIGN KEY ([created_by_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[activity_logs] ADD CONSTRAINT [FK_activity_logs_updatedByUser] FOREIGN KEY ([updated_by_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[automation_rules] ADD CONSTRAINT [CK_automation_rules_status_enum] CHECK ([status] IN (N'ACTIVE',N'INACTIVE',N'DRAFT'));

ALTER TABLE [dbo].[automation_rules] ADD CONSTRAINT [CK_automation_rules_trigger_type_enum] CHECK ([trigger_type] IN (N'TASK_CREATED',N'TASK_UPDATED',N'TASK_STATUS_CHANGED',N'TASK_ASSIGNED',N'TASK_DUE_DATE_APPROACHING',N'TASK_OVERDUE',N'SPRINT_STARTED',N'SPRINT_COMPLETED',N'PROJECT_CREATED',N'COMMENT_ADDED'));

ALTER TABLE [dbo].[automation_rules] ADD CONSTRAINT [CK_automation_rules_trigger_config_json] CHECK ([trigger_config] IS NULL OR ISJSON([trigger_config], VALUE)=1);

ALTER TABLE [dbo].[automation_rules] ADD CONSTRAINT [CK_automation_rules_action_type_enum] CHECK ([action_type] IN (N'ASSIGN_TASK',N'CHANGE_STATUS',N'ADD_LABEL',N'REMOVE_LABEL',N'SET_DUE_DATE',N'SEND_NOTIFICATION',N'SEND_EMAIL',N'ADD_COMMENT',N'MOVE_TO_SPRINT',N'CHANGE_PRIORITY'));

ALTER TABLE [dbo].[automation_rules] ADD CONSTRAINT [CK_automation_rules_action_config_json] CHECK ([action_config] IS NULL OR ISJSON([action_config], VALUE)=1);

ALTER TABLE [dbo].[automation_rules] ADD CONSTRAINT [FK_automation_rules_createdByUser] FOREIGN KEY ([created_by_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[automation_rules] ADD CONSTRAINT [FK_automation_rules_updatedByUser] FOREIGN KEY ([updated_by_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[automation_rules] ADD CONSTRAINT [FK_automation_rules_organization] FOREIGN KEY ([organization_id]) REFERENCES [dbo].[organizations] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[automation_rules] ADD CONSTRAINT [FK_automation_rules_project] FOREIGN KEY ([project_id]) REFERENCES [dbo].[projects] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[automation_rules] ADD CONSTRAINT [FK_automation_rules_workspace] FOREIGN KEY ([workspace_id]) REFERENCES [dbo].[workspaces] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[rule_executions] ADD CONSTRAINT [CK_rule_executions_trigger_data_json] CHECK ([trigger_data] IS NULL OR ISJSON([trigger_data], VALUE)=1);

ALTER TABLE [dbo].[rule_executions] ADD CONSTRAINT [CK_rule_executions_action_result_json] CHECK ([action_result] IS NULL OR ISJSON([action_result], VALUE)=1);

ALTER TABLE [dbo].[rule_executions] ADD CONSTRAINT [FK_rule_executions_rule] FOREIGN KEY ([rule_id]) REFERENCES [dbo].[automation_rules] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[rule_executions] ADD CONSTRAINT [FK_rule_executions_triggeredBy] FOREIGN KEY ([triggered_by_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[rule_executions] ADD CONSTRAINT [FK_rule_executions_createdByUser] FOREIGN KEY ([created_by_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[rule_executions] ADD CONSTRAINT [FK_rule_executions_updatedByUser] FOREIGN KEY ([updated_by_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[invitations] ADD CONSTRAINT [CK_invitations_status_enum] CHECK ([status] IN (N'PENDING',N'ACCEPTED',N'DECLINED',N'EXPIRED'));

ALTER TABLE [dbo].[invitations] ADD CONSTRAINT [FK_invitations_inviter] FOREIGN KEY ([inviter_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[invitations] ADD CONSTRAINT [FK_invitations_organization] FOREIGN KEY ([organization_id]) REFERENCES [dbo].[organizations] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[invitations] ADD CONSTRAINT [FK_invitations_workspace] FOREIGN KEY ([workspace_id]) REFERENCES [dbo].[workspaces] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[invitations] ADD CONSTRAINT [FK_invitations_project] FOREIGN KEY ([project_id]) REFERENCES [dbo].[projects] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE UNIQUE INDEX [project_inboxes_email_address_key] ON [dbo].[project_inboxes] ([email_address]) WHERE [email_address] IS NOT NULL;

ALTER TABLE [dbo].[project_inboxes] ADD CONSTRAINT [CK_project_inboxes_default_task_type_enum] CHECK ([default_task_type] IN (N'TASK',N'BUG',N'EPIC',N'STORY',N'SUBTASK'));

ALTER TABLE [dbo].[project_inboxes] ADD CONSTRAINT [CK_project_inboxes_default_priority_enum] CHECK ([default_priority] IN (N'LOWEST',N'LOW',N'MEDIUM',N'HIGH',N'HIGHEST'));

ALTER TABLE [dbo].[project_inboxes] ADD CONSTRAINT [FK_project_inboxes_project] FOREIGN KEY ([project_id]) REFERENCES [dbo].[projects] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[project_inboxes] ADD CONSTRAINT [FK_project_inboxes_defaultStatus] FOREIGN KEY ([default_status_id]) REFERENCES [dbo].[task_statuses] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[project_inboxes] ADD CONSTRAINT [FK_project_inboxes_defaultAssignee] FOREIGN KEY ([default_assignee_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[email_accounts] ADD CONSTRAINT [FK_email_accounts_projectInbox] FOREIGN KEY ([project_inbox_id]) REFERENCES [dbo].[project_inboxes] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE UNIQUE INDEX [inbox_messages_project_inbox_id_imap_uid_key] ON [dbo].[inbox_messages] ([project_inbox_id],[imap_uid]) WHERE [imap_uid] IS NOT NULL;

ALTER TABLE [dbo].[inbox_messages] ADD CONSTRAINT [CK_inbox_messages_references_json] CHECK ([references] IS NULL OR ISJSON([references], VALUE)=1);

ALTER TABLE [dbo].[inbox_messages] ADD CONSTRAINT [CK_inbox_messages_to_emails_json] CHECK ([to_emails] IS NULL OR ISJSON([to_emails], VALUE)=1);

ALTER TABLE [dbo].[inbox_messages] ADD CONSTRAINT [CK_inbox_messages_cc_emails_json] CHECK ([cc_emails] IS NULL OR ISJSON([cc_emails], VALUE)=1);

ALTER TABLE [dbo].[inbox_messages] ADD CONSTRAINT [CK_inbox_messages_bcc_emails_json] CHECK ([bcc_emails] IS NULL OR ISJSON([bcc_emails], VALUE)=1);

ALTER TABLE [dbo].[inbox_messages] ADD CONSTRAINT [CK_inbox_messages_headers_json] CHECK ([headers] IS NULL OR ISJSON([headers], VALUE)=1);

ALTER TABLE [dbo].[inbox_messages] ADD CONSTRAINT [CK_inbox_messages_status_enum] CHECK ([status] IN (N'PENDING',N'PROCESSING',N'CONVERTED',N'IGNORED',N'FAILED'));

ALTER TABLE [dbo].[inbox_messages] ADD CONSTRAINT [FK_inbox_messages_projectInbox] FOREIGN KEY ([project_inbox_id]) REFERENCES [dbo].[project_inboxes] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[inbox_messages] ADD CONSTRAINT [FK_inbox_messages_convertedByUser] FOREIGN KEY ([converted_by]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[message_attachments] ADD CONSTRAINT [FK_message_attachments_message] FOREIGN KEY ([message_id]) REFERENCES [dbo].[inbox_messages] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[inbox_rules] ADD CONSTRAINT [CK_inbox_rules_conditions_json] CHECK ([conditions] IS NULL OR ISJSON([conditions], VALUE)=1);

ALTER TABLE [dbo].[inbox_rules] ADD CONSTRAINT [CK_inbox_rules_actions_json] CHECK ([actions] IS NULL OR ISJSON([actions], VALUE)=1);

ALTER TABLE [dbo].[inbox_rules] ADD CONSTRAINT [FK_inbox_rules_projectInbox] FOREIGN KEY ([project_inbox_id]) REFERENCES [dbo].[project_inboxes] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[message_rule_results] ADD CONSTRAINT [CK_message_rule_results_priority_enum] CHECK ([priority] IN (N'LOWEST',N'LOW',N'MEDIUM',N'HIGH',N'HIGHEST'));

ALTER TABLE [dbo].[message_rule_results] ADD CONSTRAINT [CK_message_rule_results_label_ids_json] CHECK ([label_ids] IS NULL OR ISJSON([label_ids], VALUE)=1);

ALTER TABLE [dbo].[message_rule_results] ADD CONSTRAINT [FK_message_rule_results_message] FOREIGN KEY ([message_id]) REFERENCES [dbo].[inbox_messages] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[message_rule_results] ADD CONSTRAINT [FK_message_rule_results_rule] FOREIGN KEY ([rule_id]) REFERENCES [dbo].[inbox_rules] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[email_sync_logs] ADD CONSTRAINT [CK_email_sync_logs_status_enum] CHECK ([status] IN (N'SUCCESS',N'FAILED'));

CREATE UNIQUE INDEX [trello_syncs_project_id_key] ON [dbo].[trello_syncs] ([project_id]) WHERE [project_id] IS NOT NULL;

CREATE UNIQUE INDEX [trello_syncs_workspace_id_key] ON [dbo].[trello_syncs] ([workspace_id]) WHERE [workspace_id] IS NOT NULL;

ALTER TABLE [dbo].[trello_syncs] ADD CONSTRAINT [CK_trello_syncs_last_sync_status_enum] CHECK ([last_sync_status] IN (N'SUCCESS',N'FAILED'));

ALTER TABLE [dbo].[trello_syncs] ADD CONSTRAINT [CK_trello_syncs_status_mappings_json] CHECK ([status_mappings] IS NULL OR ISJSON([status_mappings], VALUE)=1);

ALTER TABLE [dbo].[trello_syncs] ADD CONSTRAINT [FK_trello_syncs_project] FOREIGN KEY ([project_id]) REFERENCES [dbo].[projects] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[trello_syncs] ADD CONSTRAINT [FK_trello_syncs_workspace] FOREIGN KEY ([workspace_id]) REFERENCES [dbo].[workspaces] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[trello_syncs] ADD CONSTRAINT [FK_trello_syncs_createdByUser] FOREIGN KEY ([created_by_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[trello_syncs] ADD CONSTRAINT [FK_trello_syncs_updatedByUser] FOREIGN KEY ([updated_by_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE UNIQUE INDEX [jira_syncs_project_id_key] ON [dbo].[jira_syncs] ([project_id]) WHERE [project_id] IS NOT NULL;

CREATE UNIQUE INDEX [jira_syncs_workspace_id_key] ON [dbo].[jira_syncs] ([workspace_id]) WHERE [workspace_id] IS NOT NULL;

ALTER TABLE [dbo].[jira_syncs] ADD CONSTRAINT [CK_jira_syncs_last_sync_status_enum] CHECK ([last_sync_status] IN (N'SUCCESS',N'FAILED'));

ALTER TABLE [dbo].[jira_syncs] ADD CONSTRAINT [CK_jira_syncs_status_mappings_json] CHECK ([status_mappings] IS NULL OR ISJSON([status_mappings], VALUE)=1);

ALTER TABLE [dbo].[jira_syncs] ADD CONSTRAINT [FK_jira_syncs_project] FOREIGN KEY ([project_id]) REFERENCES [dbo].[projects] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[jira_syncs] ADD CONSTRAINT [FK_jira_syncs_workspace] FOREIGN KEY ([workspace_id]) REFERENCES [dbo].[workspaces] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[jira_syncs] ADD CONSTRAINT [FK_jira_syncs_createdByUser] FOREIGN KEY ([created_by_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[jira_syncs] ADD CONSTRAINT [FK_jira_syncs_updatedByUser] FOREIGN KEY ([updated_by_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE UNIQUE INDEX [settings_userId_key_key] ON [dbo].[settings] ([userId],[key]) WHERE [userId] IS NOT NULL;

ALTER TABLE [dbo].[settings] ADD CONSTRAINT [FK_settings_user] FOREIGN KEY ([userId]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[media_assets] ADD CONSTRAINT [FK_media_assets_user] FOREIGN KEY ([userId]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[conversations] ADD CONSTRAINT [FK_conversations_user] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[chat_messages] ADD CONSTRAINT [FK_chat_messages_conversation] FOREIGN KEY ([conversation_id]) REFERENCES [dbo].[conversations] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

