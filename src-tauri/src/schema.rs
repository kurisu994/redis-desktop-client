// @generated automatically by Diesel CLI.

diesel::table! {
    connections (id) {
        id -> Integer,
        name -> Text,
        host -> Text,
        port -> Integer,
        read_only -> Bool,
        username -> Nullable<Text>,
        password -> Nullable<Text>,
        cluster -> Nullable<Integer>,
        nodes -> Nullable<Text>,
        security_type -> Integer,
        use_private_key -> Nullable<Integer>,
        ssh_username -> Nullable<Text>,
        ssh_host -> Nullable<Text>,
        ssh_port -> Nullable<Integer>,
        ssh_password -> Nullable<Text>,
        private_key_path -> Nullable<Text>,
        key_filter -> Text,
        delimiter -> Text,
        con_timeout -> Integer,
        execution_timeout -> Integer,
        create_date -> Timestamp,
        update_date -> Timestamp,
    }
}

diesel::table! {
    setting (id) {
        id -> Integer,
        language -> Text,
        font_size -> Integer,
        theme -> Integer,
        refresh_interval -> Integer,
        editor_font_size -> Integer,
    }
}

diesel::allow_tables_to_appear_in_same_query!(connections, setting,);
