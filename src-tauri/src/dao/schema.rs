// @generated automatically by Diesel CLI.

diesel::table! {
    connections (_id) {
        _id -> Integer,
        name -> Text,
        host -> Text,
        port -> Nullable<Integer>,
        username -> Nullable<Text>,
        password -> Nullable<Text>,
        cluster -> Nullable<Integer>,
        nodes -> Nullable<Text>,
        security_type -> Nullable<Integer>,
        use_private_key -> Nullable<Integer>,
        ssh_username -> Nullable<Text>,
        ssh_host -> Nullable<Text>,
        ssh_port -> Nullable<Integer>,
        ssh_password -> Nullable<Text>,
        private_key_path -> Nullable<Text>,
    }
}

diesel::table! {
    setting (_id) {
        _id -> Integer,
        language -> Nullable<Text>,
        font_size -> Nullable<Integer>,
        theme -> Nullable<Text>,
        refresh_interval -> Nullable<Integer>,
        editor_font_size -> Nullable<Integer>,
    }
}

diesel::allow_tables_to_appear_in_same_query!(
    connections,
    setting,
);
